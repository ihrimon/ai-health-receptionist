import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Tell us your symptoms",
    description:
      "Describe how you're feeling or which specialist you need in plain language — by chat or voice, just like talking to a real receptionist.",
  },
  {
    icon: CalendarCheck,
    title: "We check real doctor availability",
    description:
      "The assistant looks up actual open slots for the right specialist — no back-and-forth, no double-booked appointments.",
  },
  {
    icon: ShieldCheck,
    title: "Instant confirmation",
    description:
      "Once you confirm, your appointment is saved and synced straight to the doctor's calendar.",
  },
  {
    icon: Sparkles,
    title: "Available 24/7",
    description:
      "No hold music, no waiting for office hours — book your visit anytime, day or night.",
  },
];

export default function HomePage() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 py-16 text-center sm:py-20">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Stethoscope className="size-7" />
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          BrainStack AI Receptionist
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          Skip the phone queue — tell us your symptoms or the specialist
          you&apos;re looking for, and our AI receptionist finds you the
          right doctor and time. Real-time availability, instant
          confirmation, no calls required.
        </p>

        <div className="mt-8">
          <Button
            size="lg"
            nativeButton={false}
            className="cta-glow group rounded-full bg-primary px-8 text-base text-primary-foreground transition-transform hover:scale-105 hover:bg-primary/90"
            render={
              <Link href="/chat">
                <MessageCircle />
                Book Appointment
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
            }
          />
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title} className="text-left">
              <CardContent className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                  <f.icon className="size-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{f.title}</h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <footer className="relative z-10 pb-4 text-center">
        <Link
          href="/admin"
          className="text-muted-foreground/50 hover:text-muted-foreground"
        >
          Admin
        </Link>
      </footer>
    </div>
  );
}
