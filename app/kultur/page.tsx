import { redirect } from "next/navigation";

/** Kültür ekranı ana adrese taşındı; eski bağlantılar oraya yönlenir. */
export default function CultureRedirect() {
  redirect("/");
}
