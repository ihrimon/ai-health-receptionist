# FAQ / Business Policies (MVP synthetic data)

**⚠️ This is synthetic placeholder data, intentionally used for the MVP —
NOT BrainStack's real business information.** It's internally consistent
and safe to demo/test against. Swap it for actual services, pricing,
hours, and policies whenever BrainStack decides to go to production, then
run `pnpm --filter api knowledge:ingest` to re-embed and load the real
content into `knowledge_chunks`. Keep each fact under its own `## `
heading — the ingestion script splits the file on `## ` boundaries, so
one heading = one retrievable chunk.

**Marking convention for anything still unknown:** use `[NOT YET
PROVIDED]`, not a descriptive sentence — a sentence gets misread by the
chat model as a real, quotable fact even when it's only an example of
what to write. `[NOT YET PROVIDED]` can't be misread as an answer.

## What are your business hours?

We are open Monday through Friday, 9 AM to 5 PM, and Saturday 10 AM to 2
PM. Closed Sundays, except for pre-booked emergency consultations.

## What services do you offer?

We offer appointments with specialists in General Physician consultation,
Cardiology, Orthopedics, Dermatology, and Pediatrics. Let us know which
specialist or type of consultation you'd like when booking, or describe
your symptoms and we'll recommend the right doctor.

## What is your cancellation policy?

Cancellations made at least 24 hours before the appointment are free.
Cancellations within 24 hours are charged a 50% cancellation fee. No-shows
forfeit their deposit in full.

## Where are you located?

Our clinic is at 42 Wellness Road, Suite 305, Dhaka 1212, Bangladesh.
Follow-up consultations can also be done remotely via video call on
request.

## How much do your services cost?

General Physician consultation starts at ৳800. Specialist consultations
(Cardiology, Orthopedics, Dermatology, Pediatrics) start at ৳1,500. Final
pricing depends on the specific doctor and is confirmed before booking is
finalized.

## How do I book or reschedule an appointment?

You can book directly through this chat by telling us your symptoms or
the specialist you need, along with your preferred date/time. To
reschedule, contact us at least 24 hours before your appointment with
your new preferred date/time and we'll confirm availability.

## What payment methods do you accept?

We accept credit/debit cards, bank transfer, and mobile payment (bKash,
Nagad). A deposit is due at booking, with the remaining balance due after
the consultation.

## Is a deposit required, and what happens if I don't show up?

Yes, a 20% deposit is required to confirm any booking. If you don't show
up without cancelling, the deposit is non-refundable and counts toward
the cancellation fee.

## How can I contact you directly?

You can reach us at +880-1XXX-XXXXXX or support@brainstack.example for
anything this chat agent can't help with. We typically respond within
one business day.

## Are you open on public holidays?

We are closed on all government-declared public holidays in Bangladesh,
except for pre-arranged emergency consultations. Any appointment falling
on a holiday will be automatically rescheduled, and we'll reach out to
confirm a new time.

## Do I need a referral to see a specialist?

No referral is required — you can book directly with any specialist. If
you're unsure which specialist you need, describe your symptoms in the
chat and we'll recommend the right doctor for you.
