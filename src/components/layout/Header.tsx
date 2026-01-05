import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck } from "lucide-react";
import {
  useNotifications,
  useUnreadCount,
  useNotificationMutations,
} from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { LanguageToggle } from "@/components/LanguageToggle";

export function Header() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();

  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const { markAsRead, markAllAsRead } = useNotificationMutations();

  return (
    <header className="sticky top-0 z-40 bg-[#F9F9F9] border-b border-gray-100">
      <div className="container flex h-14 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src={doraLogo}
            alt="Dora Logo"
            className="h-9 w-9 rounded-full object-cover"
          />
          <span className="font-bold text-lg text-[#333] hidden sm:block">
            {t.appName}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-[#777] hover:text-[#333] transition-colors"
          >
            {t.nav.home}
          </Link>
          <Link
            to="/activity"
            className="text-sm font-medium text-[#777] hover:text-[#333] transition-colors"
          >
            {t.nav.activity}
          </Link>
        </nav>

        {/* Actions: ONLY Language + Bell */}
        <div className="flex items-center gap-2">
          <LanguageToggle />

          <Popover>
            <PopoverTrigger asChild>
              <button className="relative h-9 w-9 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Bell className="h-4 w-4 text-[#333]" />

                {/* Badge only when logged in */}
                {user && unreadCount && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>

            {/* Show list only when logged in */}
            {user && (
              <PopoverContent
                align={isRTL ? "start" : "end"}
                className="w-80 p-0 bg-white border-gray-200"
              >
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    {isRTL ? "الإشعارات" : "Notifications"}
                  </h3>

                  {unreadCount && unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => markAllAsRead.mutate()}
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      {isRTL ? "قراءة الكل" : "Mark all read"}
                    </Button>
                  )}
                </div>

                <ScrollArea className="h-80">
                  {!notifications || notifications.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      {isRTL ? "لا توجد إشعارات" : "No notifications"}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                            !notification.is_read ? "bg-blue-50/50" : ""
                          }`}
                          onClick={() => {
                            if (!notification.is_read) {
                              markAsRead.mutate(notification.id);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {notification.message?.title || "Notification"}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {notification.message?.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(
                                  new Date(notification.created_at),
                                  { addSuffix: true }
                                )}
                              </p>
                            </div>

                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            )}
          </Popover>
        </div>
      </div>
    </header>
  );
}