import { useState } from "react";
import { ArrowUpDown, Eye, Phone, MessageCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { StoreListing } from "@/types/store";
import { cn } from "@/lib/utils";

interface ListingStatsTableProps {
  listings: StoreListing[];
  className?: string;
}

type SortField = "title" | "views" | "calls" | "whatsapp";
type SortDirection = "asc" | "desc";

export function ListingStatsTable({ listings, className }: ListingStatsTableProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [sortField, setSortField] = useState<SortField>("views");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(language === "ar" ? "ar" : "en").format(num);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedListings = [...listings].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case "views":
        aValue = a.views_count || 0;
        bValue = b.views_count || 0;
        break;
      case "calls":
        aValue = a.calls_count || 0;
        bValue = b.calls_count || 0;
        break;
      case "whatsapp":
        aValue = a.whatsapp_count || 0;
        bValue = b.whatsapp_count || 0;
        break;
      default:
        aValue = a.title;
        bValue = b.title;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    return sortDirection === "asc"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  return (
    <div className={cn("rounded-lg border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("title")}
                className="h-8"
              >
                {t("الإعلان", "Listing")}
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("views")}
                className="h-8"
              >
                <Eye className="mr-2 h-4 w-4" />
                {t("المشاهدات", "Views")}
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("calls")}
                className="h-8"
              >
                <Phone className="mr-2 h-4 w-4" />
                {t("المكالمات", "Calls")}
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("whatsapp")}
                className="h-8"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {t("واتساب", "WhatsApp")}
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>{t("الحالة", "Status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedListings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                {t("لا توجد إعلانات", "No listings")}
              </TableCell>
            </TableRow>
          ) : (
            sortedListings.map((listing) => (
              <TableRow key={listing.id}>
                <TableCell className="font-medium">{listing.title}</TableCell>
                <TableCell>{formatNumber(listing.views_count || 0)}</TableCell>
                <TableCell>{formatNumber(listing.calls_count || 0)}</TableCell>
                <TableCell>{formatNumber(listing.whatsapp_count || 0)}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "px-2 py-1 rounded text-xs",
                      listing.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : listing.status === "paused"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    )}
                  >
                    {listing.status === "active"
                      ? t("نشط", "Active")
                      : listing.status === "paused"
                      ? t("متوقف", "Paused")
                      : t("مسودة", "Draft")}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
