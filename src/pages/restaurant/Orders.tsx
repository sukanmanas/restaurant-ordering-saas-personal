import React, { useEffect, useState, useRef } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Phone,
  User,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Modal,
  Textarea,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToOrders,
  updateOrderStatus,
} from "../../services/restaurantService";
import type { Order } from "../../config/supabase";
import { formatDateTime, formatCurrency, playSound } from "../../utils/helpers";

const STATUS_TH: Record<string, string> = {
  pending: "รอรับออเดอร์",
  accepted: "กำลังทำ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  rejected: "ปฏิเสธ",
};

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const prevOrderCountRef = useRef(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    const subscription = subscribeToOrders(user.restaurant_id, (data) => {
      if (data.length > prevOrderCountRef.current) {
        const newOrders = data.filter(
          (order) =>
            order.status === "pending" && !orders.find((o) => o.id === order.id)
        );
        if (newOrders.length > 0) playSound("notification");
      }
      prevOrderCountRef.current = data.length;
      setOrders(data);
      setLoading(false);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const filteredOrders = orders
    .filter((order) => order.status === statusFilter)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const success = await updateOrderStatus(orderId, newStatus);
    if (!success) alert("ไม่สามารถอัปเดตสถานะได้");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "warning",
      accepted: "accent-secondary",
      completed: "success",
      cancelled: "neutral",
      rejected: "error",
    };
    return <Badge variant={variants[status] || "neutral"}>{STATUS_TH[status] || status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-5 h-5 text-warning" />;
      case "accepted": return <Package className="w-5 h-5 text-accent-secondary" />;
      case "completed": return <CheckCircle className="w-5 h-5 text-success" />;
      case "cancelled":
      case "rejected": return <XCircle className="w-5 h-5 text-error" />;
      default: return <Clock className="w-5 h-5 text-text-secondary" />;
    }
  };

  if (loading) return <Loading text="กำลังโหลดออเดอร์..." />;

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">รายการออเดอร์</h2>
          <p className="text-text-secondary">จัดการและติดตามออเดอร์แบบเรียลไทม์</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning" className="text-lg px-4 py-2 animate-pulse">
            {pendingCount} รอรับ
          </Badge>
        )}
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>อัปเดตออเดอร์แบบเรียลไทม์ • เปิดการแจ้งเตือนเสียงแล้ว</span>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {["pending", "accepted", "completed", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === status
                ? "bg-accent text-white"
                : "bg-bg-subtle text-text-secondary hover:bg-border"
            }`}
          >
            {STATUS_TH[status]}
            {status === "pending" && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">ไม่พบออเดอร์</h3>
          <p className="text-text-secondary">ไม่มีออเดอร์ {STATUS_TH[statusFilter]} ในขณะนี้</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className={`hover:shadow-lg transition-shadow ${
                order.status === "pending" ? "border-l-4 border-l-warning" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <h3 className="text-lg font-bold text-text">
                          ออเดอร์ #{order.order_number}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <Package className="w-4 h-4" />
                      <span>
                        {order.table_number ? `โต๊ะ ${order.table_number}` : "กลับบ้าน"}
                      </span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${order.customer_phone}`} className="text-accent hover:underline">
                          {order.customer_phone}
                        </a>
                      </div>
                    )}
                    {order.customer_name && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <User className="w-4 h-4" />
                        <span>{order.customer_name}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <span className="font-semibold text-text">
                        {order.items?.length || 0} รายการ
                      </span>
                      <span>•</span>
                      <span className="font-bold text-text text-lg">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>

                  {order.customer_notes && (
                    <div className="flex items-start space-x-2 text-sm bg-bg-subtle rounded-lg p-3">
                      <MessageSquare className="w-4 h-4 text-accent-secondary mt-0.5" />
                      <div>
                        <p className="font-medium text-text">หมายเหตุลูกค้า:</p>
                        <p className="text-text-secondary">{order.customer_notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex lg:flex-col gap-2 lg:min-w-[160px]">
                  <Button variant="outline" size="sm" fullWidth onClick={() => { setSelectedOrder(order); setShowDetailsModal(true); }}>
                    ดูรายละเอียด
                  </Button>

                  {order.status === "pending" && (
                    <>
                      <Button variant="secondary" size="sm" fullWidth onClick={() => handleStatusUpdate(order.id, "accepted")}>
                        รับออเดอร์
                      </Button>
                      <Button variant="outline" size="sm" fullWidth onClick={() => { setSelectedOrder(order); setShowRejectModal(true); }}>
                        ยกเลิก
                      </Button>
                    </>
                  )}

                  {order.status === "accepted" && (
                    <>
                      <Button variant="secondary" size="sm" fullWidth onClick={() => handleStatusUpdate(order.id, "completed")}>
                        เสร็จสิ้น
                      </Button>
                      <Button variant="outline" size="sm" fullWidth onClick={() => { setSelectedOrder(order); setShowRejectModal(true); }}>
                        ยกเลิก
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <OrderDetailsModal
        isOpen={showDetailsModal}
        order={selectedOrder}
        onClose={() => { setShowDetailsModal(false); setSelectedOrder(null); }}
      />

      <RejectOrderModal
        isOpen={showRejectModal}
        order={selectedOrder}
        onClose={() => { setShowRejectModal(false); setSelectedOrder(null); }}
        onReject={handleStatusUpdate}
      />
    </div>
  );
};

interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, order, onClose }) => {
  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ออเดอร์ #${order.order_number}`} size="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg">
          <span className="font-medium text-text">สถานะ</span>
          <Badge variant={order.status === "completed" ? "success" : order.status === "pending" ? "warning" : "neutral"}>
            {STATUS_TH[order.status] || order.status}
          </Badge>
        </div>

        <div>
          <h4 className="font-semibold text-text mb-3">ข้อมูลลูกค้า</h4>
          <div className="space-y-2 text-sm">
            {order.customer_name && (
              <p className="text-text-secondary"><strong className="text-text">ชื่อ:</strong> {order.customer_name}</p>
            )}
            {order.customer_phone && (
              <p className="text-text-secondary"><strong className="text-text">โทรศัพท์:</strong> {order.customer_phone}</p>
            )}
            <p className="text-text-secondary">
              <strong className="text-text">ประเภท:</strong>{" "}
              {order.table_number ? `โต๊ะ ${order.table_number}` : "กลับบ้าน"}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-text mb-3">รายการอาหาร</h4>
          <div className="space-y-3">
            {order.items?.map((item: any, index: number) => (
              <div key={index} className="flex items-start justify-between p-3 bg-bg-subtle rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-text">{item.quantity}x {item.name_th || item.name}</p>
                  {item.selected_size && (
                    <p className="text-sm text-text-secondary">ขนาด: {item.selected_size.name}</p>
                  )}
                  {item.selected_addons && item.selected_addons.length > 0 && (
                    <p className="text-sm text-text-secondary">
                      ท็อปปิ้ง: {item.selected_addons.map((a: any) => `${a.name}${a.quantity > 1 ? ` x${a.quantity}` : ""}`).join(", ")}
                    </p>
                  )}
                  {item.spicy_level && (
                    <p className="text-sm text-red-500">🌶 ความเผ็ด: {item.spicy_level}</p>
                  )}
                  {item.special_instructions && (
                    <p className="text-sm text-orange-500 italic">หมายเหตุ: {item.special_instructions}</p>
                  )}
                </div>
                <p className="font-semibold text-text">{formatCurrency(item.item_total || item.subtotal || 0)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex justify-between text-lg font-bold text-text pt-2">
            <span>รวมทั้งหมด</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {order.customer_notes && (
          <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg p-4">
            <h4 className="font-semibold text-text mb-2">หมายเหตุลูกค้า</h4>
            <p className="text-text-secondary text-sm">{order.customer_notes}</p>
          </div>
        )}

        <Button onClick={onClose} fullWidth>ปิด</Button>
      </div>
    </Modal>
  );
};

interface RejectOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onReject: (orderId: string, status: string, notes?: string) => void;
}

const RejectOrderModal: React.FC<RejectOrderModalProps> = ({ isOpen, order, onClose, onReject }) => {
  const [reason, setReason] = useState("");

  const handleCancel = () => {
    if (!order) return;
    onReject(order.id, "cancelled", reason);
    onClose();
    setReason("");
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ยกเลิกออเดอร์" size="md">
      <div className="space-y-4">
        <Alert type="warning" message="คุณแน่ใจหรือไม่ที่จะยกเลิกออเดอร์นี้?" />
        <Textarea
          label="เหตุผลการยกเลิก (ไม่บังคับ)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="เช่น หมด, ครัวปิด, ลูกค้าขอยกเลิก..."
          rows={3}
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>กลับ</Button>
          <Button variant="danger" onClick={handleCancel} fullWidth>ยืนยันการยกเลิก</Button>
        </div>
      </div>
    </Modal>
  );
};

export default Orders;
