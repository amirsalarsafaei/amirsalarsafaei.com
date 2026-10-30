import { Suspense } from "react";
import Loading from "@/components/Loading/Loading";
import AdminBlogsClient from "./AdminBlogsClient";

export const metadata = {
  title: "admin · blogs",
  robots: { index: false, follow: false },
};

export default function AdminBlogsPage() {
  return (
    // The list reads `page-size` from the URL on the client; this boundary lets
    // the route still server-render instead of bailing the whole page out.
    <Suspense fallback={<Loading message="blogs" />}>
      <AdminBlogsClient />
    </Suspense>
  );
}
