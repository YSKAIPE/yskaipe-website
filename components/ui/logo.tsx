import Link from "next/link";
import Image from "next/image";
import logo from "@/public/images/yskaipe-logo-a1.jpg";

export default function Logo() {
  return (
    <Link href="/" className="inline-flex shrink-0" aria-label="Cruip">
      <Image src={logo} alt="YSKAIPE-LOGO" width={305} height={128} />
    </Link>
  );
}
