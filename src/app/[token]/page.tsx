"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TokenRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.token as string;
    if (token) {
      router.replace(`/evento/${token}`);
    }
  }, [params.token, router]);

  return null;
}
