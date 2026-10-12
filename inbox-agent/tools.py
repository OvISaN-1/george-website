"""Tools the agent can call, plus the JSON schemas Claude sees.

The tools only *propose* things. Nothing is ever sent from here: replies go
into a pending queue and a human has to approve each one (see approval.py).
"""
import json
from pathlib import Path

CATEGORIES = ["urgent", "request", "info", "spam"]


class Mailbox:
    def __init__(self, path):
        self.messages = json.loads(Path(path).read_text())
        self.triage = {}   # message id -> {"category", "reason"}
        self.drafts = {}   # message id -> reply text (pending approval)

    def _find(self, message_id):
        for m in self.messages:
            if m["id"] == message_id:
                return m
        raise KeyError(f"no message with id {message_id!r}")

    def list_inbox(self):
        return [{"id": m["id"], "from": m["from"], "subject": m["subject"]} for m in self.messages]

    def read_message(self, message_id):
        return self._find(message_id)

    def set_triage(self, message_id, category, reason):
        self._find(message_id)
        if category not in CATEGORIES:
            raise ValueError(f"category must be one of {CATEGORIES}")
        self.triage[message_id] = {"category": category, "reason": reason}
        return "ok"

    def draft_reply(self, message_id, body):
        self._find(message_id)
        self.drafts[message_id] = body
        return "draft saved for human approval (not sent)"

    def run(self, name, args):
        """Run a tool by name. Errors are returned as text so Claude can recover."""
        try:
            fn = getattr(self, name)
            if name.startswith("_") or name == "run":
                raise AttributeError(name)
            return json.dumps(fn(**args))
        except Exception as e:  # noqa: BLE001 - reported back to the model
            return f"error: {e}"


TOOL_SCHEMAS = [
    {"name": "list_inbox", "description": "List all messages (id, sender, subject).",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "read_message", "description": "Read the full body of one message.",
     "input_schema": {"type": "object", "properties": {"message_id": {"type": "string"}},
                      "required": ["message_id"]}},
    {"name": "set_triage", "description": "Label a message with a category and a one-line reason.",
     "input_schema": {"type": "object", "properties": {
         "message_id": {"type": "string"},
         "category": {"type": "string", "enum": CATEGORIES},
         "reason": {"type": "string"}},
         "required": ["message_id", "category", "reason"]}},
    {"name": "draft_reply", "description": "Save a draft reply for human approval. Never sends.",
     "input_schema": {"type": "object", "properties": {
         "message_id": {"type": "string"}, "body": {"type": "string"}},
         "required": ["message_id", "body"]}},
]
