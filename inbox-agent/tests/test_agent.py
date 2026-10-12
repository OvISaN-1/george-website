"""Tests use a scripted fake Claude, so they run offline with no API key."""
import sys
from pathlib import Path
from types import SimpleNamespace as NS

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agent import run_agent  # noqa: E402
from approval import review_drafts  # noqa: E402
from tools import Mailbox  # noqa: E402

INBOX = Path(__file__).resolve().parent.parent / "inbox.json"


def tool(id, name, **args):
    return NS(type="tool_use", id=id, name=name, input=args)


def reply(*blocks, stop="tool_use"):
    return NS(content=list(blocks), stop_reason=stop)


class FakeClient:
    def __init__(self, script):
        self.messages = self
        self.script = iter(script)

    def create(self, **_):
        return next(self.script)


def test_agent_triages_and_drafts_without_sending(tmp_path):
    mb = Mailbox(INBOX)
    script = [
        reply(tool("1", "set_triage", message_id="m1", category="urgent", reason="outage")),
        reply(tool("2", "draft_reply", message_id="m1", body="On it.")),
        reply(NS(type="text", text="done"), stop="end_turn"),
    ]
    out = run_agent(mb, client=FakeClient(script), on_event=lambda *_: None)
    assert out == "done"
    assert mb.triage["m1"]["category"] == "urgent"
    assert mb.drafts["m1"] == "On it."
    assert not (tmp_path / "outbox.json").exists()


def test_bad_tool_input_is_returned_not_raised():
    mb = Mailbox(INBOX)
    assert mb.run("set_triage", {"message_id": "m1", "category": "bogus", "reason": "x"}).startswith("error")
    assert mb.run("read_message", {"message_id": "nope"}).startswith("error")
    assert mb.run("run", {}).startswith("error")  # internals aren't callable


def test_turn_limit_stops_runaway_agent(monkeypatch):
    import agent
    monkeypatch.setattr(agent, "MAX_TURNS", 3)
    loop = [reply(tool(str(i), "list_inbox")) for i in range(10)]
    out = run_agent(Mailbox(INBOX), client=FakeClient(loop), on_event=lambda *_: None)
    assert "turn limit" in out


def test_only_approved_drafts_are_sent(tmp_path):
    mb = Mailbox(INBOX)
    mb.draft_reply("m1", "Looking into the VPN now.")
    mb.draft_reply("m3", "Access granted.")
    answers = iter(["a", "s"])
    sent = review_drafts(mb, tmp_path / "out.json", ask=lambda _: next(answers), show=lambda *_: None)
    assert [s["to"] for s in sent] == ["sarah.k@acme-corp.example"]
    assert mb.drafts == {}


def test_edit_replaces_the_text(tmp_path):
    mb = Mailbox(INBOX)
    mb.draft_reply("m1", "original")
    answers = iter(["e", "edited"])
    sent = review_drafts(mb, tmp_path / "out.json", ask=lambda _: next(answers), show=lambda *_: None)
    assert sent[0]["body"] == "edited"
