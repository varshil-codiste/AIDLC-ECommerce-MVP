import { redirect } from 'next/navigation';

export default function Home() {
  // The chat surface lives at /chat; route is created in UoW-05.
  // Until then this redirect lands on a 404 — intentional per the UoW-01 plan.
  redirect('/chat');
}
