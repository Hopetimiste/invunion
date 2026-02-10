import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Webhook, ScrollText } from "lucide-react";
import { ApiKeySection } from "@/components/settings/ApiKeySection";
import { WebhookSection } from "@/components/settings/WebhookSection";
import { AuditLogSection } from "@/components/settings/AuditLogSection";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TechnicalSettings() {
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="container max-w-6xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("settings.technical")}</h1>
          <p className="text-muted-foreground mt-2">{t("settings.technicalDescription")}</p>
        </div>

        <Tabs defaultValue="api-key" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.apiKey")}</span>
            </TabsTrigger>
            <TabsTrigger value="webhook" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.webhook")}</span>
            </TabsTrigger>
            <TabsTrigger value="audit-log" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.auditLog")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-key" className="mt-6">
            <ApiKeySection />
          </TabsContent>

          <TabsContent value="webhook" className="mt-6">
            <WebhookSection />
          </TabsContent>

          <TabsContent value="audit-log" className="mt-6">
            <AuditLogSection />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
