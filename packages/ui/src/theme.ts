// antd ConfigProvider theme map từ token prototype (Blueprint §7.0).
import type { ThemeConfig } from 'antd';
import { color, font, radius } from './tokens';

export const appTheme: ThemeConfig = {
  cssVar: { key: 'ac' },
  hashed: false,
  token: {
    colorPrimary: color.brand,
    colorSuccess: color.brand,
    colorError: color.danger,
    colorInfo: color.blue,
    colorLink: color.brandDeep,
    colorText: color.text,
    colorTextSecondary: color.text3,
    colorTextTertiary: color.text4,
    colorBorder: color.border,
    colorBorderSecondary: color.divider,
    colorBgLayout: color.bg,
    colorBgContainer: color.surface,
    fontFamily: font.family,
    fontFamilyCode: font.mono,
    fontSize: font.size.body,
    borderRadius: radius.md,
    borderRadiusLG: radius.xxl,
    borderRadiusSM: radius.sm,
    controlHeight: 36,
    motion: true,
  },
  components: {
    Button: { fontWeight: font.weight.bold, primaryShadow: 'none' },
    Drawer: { paddingLG: 0 },
  },
};
