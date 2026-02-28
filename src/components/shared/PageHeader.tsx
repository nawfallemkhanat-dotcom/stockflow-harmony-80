import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Filter } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  onAdd?: () => void;
  addLabel?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

const PageHeader = ({
  title,
  description,
  onAdd,
  addLabel = "Add New",
  searchValue = "",
  onSearchChange,
  showSearch = true,
}: PageHeaderProps) => {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {onAdd && (
          <Button onClick={onAdd} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            {addLabel}
          </Button>
        )}
      </div>
      {showSearch && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>
      )}
    </div>
  );
};

export default PageHeader;
