import StatusScreen from "@/components/StatusScreen/StatusScreen";

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="not_found"
      message="The cows couldn't find this page."
      detail="The URL may be wrong, or the page may have moved."
      actionLabel="Back home"
      actionHref="/"
    />
  );
}
