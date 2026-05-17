import type { Metadata } from "next";
import { CheckinForm } from "./CheckinForm";

export const metadata: Metadata = { title: "Check-in mi-challenge" };

export default function CheckinPage() {
  return <CheckinForm />;
}
