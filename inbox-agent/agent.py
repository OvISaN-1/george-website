"""The agent loop: send messages to Claude, run any tools it asks for, repeat."""
import anthropic

from tools import TOOL_SCHEMAS, Mailbox

MODEL = "claude-sonnet-5-5"
MAX_TURNS = 20  # hard stop so a confused agent can't loop forever

SYSTEM = """You are an IT helpdesk triage assistant.
1. List the inbox, then read each message.
2. Label every message with set_triage (urgent, request, info or spam).
3. For urgent messages and requests, write a short, polite draft_reply.
   Do not draft replies to spam or info-only messages.
Never promise things you cannot verify. A human reviews every draft before it is sent.
When finished, reply with a one-line summary."""


def run_agent(mailbox: Mailbox, client=None, model=MODEL, on_event=print):
    client = client or anthropic.Anthropic()
    messages = [{"role": "user", "content": "Please triage the inbox."}]

    for _ in range(MAX_TURNS):
        resp = client.messages.create(
            model=model, max_tokens=2000, system=SYSTEM,
            tools=TOOL_SCHEMAS, messages=messages,
        )
        messages.append({"role": "assistant", "content": resp.content})

        if resp.stop_reason != "tool_use":
            return "".join(b.text for b in resp.content if b.type == "text")

        results = []
        for block in resp.content:
            if block.type == "tool_use":
                on_event(f"  tool: {block.name}({block.input})")
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": mailbox.run(block.name, block.input)})
        messages.append({"role": "user", "content": results})

    return "stopped: reached the turn limit"
