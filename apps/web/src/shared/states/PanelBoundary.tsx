// Boundary cho panel / drawer / modal phụ (TIP-001b §2.2): lỗi render bên trong chỉ thay vùng đó bằng trạng thái lỗi + Thử lại, phần
// còn lại của màn vẫn dùng được. Thử lại = dựng lại cây con (key mới). Có `onDismiss` (drawer / modal tải lười) thì thêm nút Đóng: ẩn
// vùng lỗi tới lần mở sau (`active` lên lại true); vùng bị đóng từ nơi khác khi đang lỗi cũng ẩn khung lỗi. Log qua `logClientError`, không hiện message / stack.
'use client';
import { Component, Fragment, type ReactNode } from 'react';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { logClientError } from '../dev/client-log';
import { MockFaultProbe } from '../dev/MockFault';
import { PageStates } from './PageStates';

export interface PanelBoundaryProps {
  /** Tên vùng — vào log (`panel:<name>`) và `data-panel` của trạng thái lỗi. */
  name: string;
  children?: ReactNode;
  /** Khung của trạng thái lỗi (vd khung cố định cạnh phải cho drawer tải lười). */
  className?: string;
  onDismiss?: () => void;
  /** Vùng đang mở — false → true sau khi Đóng thì dựng lại. Mặc định luôn mở. */
  active?: boolean;
}

interface PanelBoundaryState {
  failed: boolean;
  hidden: boolean;
  attempt: number;
  wasActive: boolean;
}

function PanelError({ name, className, onRetry, onDismiss }: { name: string; className?: string; onRetry: () => void; onDismiss?: () => void }) {
  const t = useTranslations('common');
  return (
    <div data-testid="panel-error" data-panel={name} className={className}>
      <PageStates state="error" onRetry={onRetry}>
        {null}
      </PageStates>
      {onDismiss ? (
        <Button type="text" block onClick={onDismiss} data-testid="panel-error-close">
          {t('close')}
        </Button>
      ) : null}
    </div>
  );
}

export class PanelBoundary extends Component<PanelBoundaryProps, PanelBoundaryState> {
  override state: PanelBoundaryState = { failed: false, hidden: false, attempt: 0, wasActive: true };

  static getDerivedStateFromError(): Partial<PanelBoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: PanelBoundaryProps, s: PanelBoundaryState): Partial<PanelBoundaryState> | null {
    const active = props.active ?? true;
    if (active === s.wasActive) return null;
    // Đóng vùng (store) khi đang lỗi → ẩn khung lỗi; mở lại sau khi ẩn → dựng lại cây con.
    if (!active) return s.failed ? { wasActive: false, failed: false, hidden: true } : { wasActive: false };
    return s.hidden ? { wasActive: true, hidden: false, failed: false, attempt: s.attempt + 1 } : { wasActive: true };
  }

  override componentDidCatch(error: unknown) {
    logClientError(`panel:${this.props.name}`, error);
  }

  private retry = () => this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));

  private dismiss = () => {
    this.setState({ failed: false, hidden: true });
    this.props.onDismiss?.();
  };

  override render() {
    const { name, children, className, onDismiss } = this.props;
    if (this.state.hidden) return null;
    if (this.state.failed) return <PanelError name={name} className={className} onRetry={this.retry} onDismiss={onDismiss ? this.dismiss : undefined} />;
    return (
      <Fragment key={this.state.attempt}>
        {children}
        <MockFaultProbe at={`panel:${name}`} />
      </Fragment>
    );
  }
}
