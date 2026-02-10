import { AppLayout } from "@/components/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { InvoiceMatchingStats } from "@/components/dashboard/InvoiceMatchingStats";
import { LinkedSystems } from "@/components/dashboard/LinkedSystems";
import { FileText, Receipt, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();

  const stats = [
    {
      title: t("dashboard.invoicesIssued"),
      value: "156",
      change: 8.3,
      changeLabel: t("dashboard.vsLastMonth"),
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: t("dashboard.invoicesReceived"),
      value: "89",
      change: 12.1,
      changeLabel: t("dashboard.vsLastMonth"),
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      title: t("dashboard.transactionsMatched"),
      value: "312",
      change: 15.4,
      changeLabel: t("dashboard.vsLastMonth"),
      icon: <ArrowRightLeft className="h-5 w-5" />,
    },
    {
      title: t("dashboard.pendingActions"),
      value: "24",
      change: -18.2,
      changeLabel: t("dashboard.vsLastMonth"),
      icon: <AlertTriangle className="h-5 w-5" />,
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatsCard
              key={stat.title}
              {...stat}
              delay={index * 50}
            />
          ))}
        </div>

        {/* Invoice Matching & Linked Systems */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InvoiceMatchingStats />
          <LinkedSystems />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <RecentActivity />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
