import PaperList from "@/components/PaperList";

export default function ToReadListPage() {
  return (
    <PaperList
      list="to_read"
      title="To Read"
      emptyMessage="No papers in your To Read list yet. Search for papers to get started."
    />
  );
}
