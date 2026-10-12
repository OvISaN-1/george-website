import sys

from agent import run_agent
from approval import review_drafts
from tools import Mailbox


def main():
    mailbox = Mailbox("inbox.json")
    print("Triaging...")
    print(run_agent(mailbox))
    print("\nTriage:")
    for mid, t in mailbox.triage.items():
        print(f"  {mid}: {t['category']:8} {t['reason']}")
    sent = review_drafts(mailbox, "outbox.json")
    print(f"\n{len(sent)} reply(ies) approved -> outbox.json (nothing is actually emailed)")


if __name__ == "__main__":
    sys.exit(main())
