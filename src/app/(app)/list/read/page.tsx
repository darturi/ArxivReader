import PaperList from "@/components/PaperList";

export default function ReadListPage() {
  return (
    <PaperList
      list="read"
      title="Read"
      emptyMessage="No papers in your Read list yet. Search for papers to get started."
    />
  );
}
