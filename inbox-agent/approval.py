"""Human-in-the-loop gate: nothing leaves the building without a yes."""
import json
from pathlib import Path


def review_drafts(mailbox, outbox_path, ask=input, show=print):
    """Walk each pending draft. [a]pprove, [e]dit, [s]kip. Returns the approved list."""
    approved = []
    for mid, body in mailbox.drafts.items():
        msg = mailbox.read_message(mid)
        show(f"\nTo: {msg['from']}\nRe: {msg['subject']}\n---\n{body}\n---")
        choice = ask("[a]pprove / [e]dit / [s]kip > ").strip().lower()
        if choice == "e":
            body = ask("New text > ")
            choice = "a"
        if choice == "a":
            approved.append({"to": msg["from"], "subject": "Re: " + msg["subject"], "body": body})
    mailbox.drafts.clear()
    if approved:
        # Stand-in for a real send. Swap this for the Gmail API when you're ready.
        Path(outbox_path).write_text(json.dumps(approved, indent=2))
    return approved
