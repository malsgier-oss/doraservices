import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Upload, Download, CheckCircle, XCircle, AlertCircle, Phone, Tag, Layers } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";
import { useCities } from "@/hooks/useCities";

interface ParsedService {
  row: number;
  title: string;
  description: string;
  city: string;
  provider_phone: string;
  provider_name: string;
  status: "pending" | "success" | "error";
  error?: string;
}

export default function AdminBulkUpload() {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const { data: cities } = useCities();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parsedData, setParsedData] = useState<ParsedService[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");

  // Get the category ID for the selected category name
  const selectedCategoryObj = categories?.find(c => c.name === selectedCategory);
  const { data: subcategories } = useSubcategories(selectedCategoryObj?.id);

  const cityNames = cities?.map((c) => c.name.toLowerCase()) || [];

  const downloadTemplate = () => {
    const template = `title,city,provider_phone,provider_name,description
"AC Repair Service","Tripoli","+218912345678","Ahmed Mohammed","Professional AC repair and maintenance"
"Hair Styling","Benghazi","+218923456789","Fatima Ali","Expert hair styling services"`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "services_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedService[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, "").toLowerCase());
    const titleIdx = headers.indexOf("title");
    const descIdx = headers.indexOf("description");
    const cityIdx = headers.indexOf("city");
    const phoneIdx = headers.indexOf("provider_phone");
    const nameIdx = headers.indexOf("provider_name");

    if (titleIdx === -1 || phoneIdx === -1) {
      toast.error("Invalid CSV format. Required columns: title, provider_phone");
      return [];
    }

    const services: ParsedService[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const title = values[titleIdx]?.trim();
      const description = descIdx !== -1 ? values[descIdx]?.trim() || "" : "";
      const city = cityIdx !== -1 ? values[cityIdx]?.trim() || "" : "";
      const providerPhone = values[phoneIdx]?.trim();
      const providerName = nameIdx !== -1 ? values[nameIdx]?.trim() || "" : "";

      const service: ParsedService = {
        row: i + 1,
        title,
        description,
        city,
        provider_phone: providerPhone,
        provider_name: providerName,
        status: "pending",
      };

      // Validate
      if (!title) {
        service.status = "error";
        service.error = "Title is required";
      } else if (city && !cityNames.includes(city.toLowerCase())) {
        service.status = "error";
        service.error = `Invalid city: ${city}`;
      } else if (!providerPhone) {
        service.status = "error";
        service.error = "Provider phone is required";
      }

      services.push(service);
    }

    return services;
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    const text = await file.text();
    const parsed = parseCSV(text);
    
    if (parsed.length === 0) {
      toast.error("No valid data found in the file");
      return;
    }

    setParsedData(parsed);
    setUploadComplete(false);
    setStats({ total: parsed.length, success: 0, failed: parsed.filter((p) => p.status === "error").length });
  };

  const processUpload = async () => {
    if (parsedData.length === 0 || !selectedCategory) return;

    setIsUploading(true);
    setUploadProgress(0);

    const pendingItems = parsedData.filter((p) => p.status === "pending");
    let successCount = 0;
    let failedCount = parsedData.filter((p) => p.status === "error").length;

    // Use subcategory name if selected, otherwise use category name
    const categoryToUse = selectedSubcategory || selectedCategory;

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      
      try {
        const matchingCity = cities?.find(
          (c) => c.name.toLowerCase() === item.city.toLowerCase()
        );

        // Insert with user_id = NULL (unclaimed) and provider_phone for claiming
        const { error } = await supabase.from("services").insert({
          title: item.title,
          description: item.description || null,
          category: categoryToUse,
          city: matchingCity?.name || item.city || null,
          provider_phone: item.provider_phone,
          provider_name: item.provider_name || null,
          user_id: null, // Unclaimed - will be set when provider signs up
          price: null, // Provider sets price after claiming
          is_visible: true,
          is_active: true,
        });

        if (error) throw error;

        item.status = "success";
        successCount++;
      } catch (err) {
        item.status = "error";
        item.error = err instanceof Error ? err.message : "Upload failed";
        failedCount++;
      }

      setUploadProgress(((i + 1) / pendingItems.length) * 100);
      setParsedData([...parsedData]);
    }

    setStats({ total: parsedData.length, success: successCount, failed: failedCount });
    setIsUploading(false);
    setUploadComplete(true);

    // Log admin action
    await supabase.rpc("log_admin_action", {
      p_action: "bulk_upload",
      p_target_type: "services",
      p_details: { 
        total: parsedData.length, 
        success: successCount, 
        failed: failedCount, 
        category: selectedCategory,
        subcategory: selectedSubcategory || null,
      },
    });

    queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    toast.success(`Upload complete: ${successCount} succeeded, ${failedCount} failed`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedSubcategory(""); // Reset subcategory when category changes
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Bulk Upload Services</h1>
        <p className="text-muted-foreground">Upload services with phone numbers - providers will claim them when they sign up</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Select a category (and optionally a subcategory like Electrician), download the template, add services, then upload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Main Category
            </label>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Choose a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory Selection */}
          {selectedCategory && subcategories && subcategories.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Subcategory (Optional - e.g., Electrician, Plumber)
              </label>
              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select specific service type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All {selectedCategory}</SelectItem>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.name}>
                      {sub.name} {sub.name_ar ? `(${sub.name_ar})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedSubcategory 
                  ? `Services will be created as "${selectedSubcategory}"` 
                  : `Services will be created as "${selectedCategory}"`}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedCategory}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {!selectedCategory && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a category before uploading a CSV file.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Phone className="h-4 w-4" />
            <AlertDescription>
              <strong>Required:</strong> title, provider_phone. <strong>Optional:</strong> city, provider_name, description.
              <br />
              <span className="text-muted-foreground">When a provider signs up with a matching phone number, services are automatically linked to their account.</span>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preview ({parsedData.length} services)</span>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge className="bg-green-500">{stats.success} Success</Badge>
                  <Badge variant="destructive">{stats.failed} Failed</Badge>
                  <Badge variant="secondary">{stats.total - stats.success - stats.failed} Pending</Badge>
                </div>
                {!uploadComplete && (
                  <Button onClick={processUpload} disabled={isUploading || !selectedCategory}>
                    {isUploading ? "Uploading..." : "Start Upload"}
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isUploading && (
              <div className="mb-4">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Provider Phone</TableHead>
                    <TableHead>Provider Name</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.row}</TableCell>
                      <TableCell>{getStatusIcon(item.status)}</TableCell>
                      <TableCell className="max-w-32 truncate">{item.title}</TableCell>
                      <TableCell>{item.city || "-"}</TableCell>
                      <TableCell>{item.provider_phone}</TableCell>
                      <TableCell>{item.provider_name || "-"}</TableCell>
                      <TableCell className="text-destructive text-sm max-w-48 truncate">
                        {item.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
