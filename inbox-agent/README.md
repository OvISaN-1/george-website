# Inbox triage agent

A Claude agent that reads a (mock) helpdesk inbox, labels each message, drafts replies, and
asks a human to approve every reply before anything is "sent".

## Run it
    pip install -r requirements.txt
    export ANTHROPIC_API_KEY=sk-ant-...
    python main.py        # triage, then approve/edit/skip each draft
    pytest                # offline tests, no key needed

## How it works
- `agent.py`: the loop. Call Claude, run the tools it asks for, feed results back, stop at the turn limit.
- `tools.py`: four tools (list, read, label, draft). Tools only propose; they cannot send.
- `approval.py`: the human gate. Only approved drafts reach `outbox.json`.
- `inbox.json`: fake messages. Never put real email here.

## Ideas to level it up
1. Swap `Mailbox` for the Gmail API (read-only first, then drafts).
2. Add a `search_knowledge_base` tool so replies cite real fixes.
3. Log every tool call to a file for an audit trail.
4. Add an eval set: 20 labelled emails, measure triage accuracy per model.
