// Configuration for invoice size
export const INVOICE_SIZES = {
  small: {
    baseFontSize: '10px',
    text4xl: '24px',
    text3xl: '20px',
    text2xl: '18px',
    textXl: '16px',
    textLg: '14px',
    textBase: '12px',
    textSm: '10px',
    tablePadding: '6px'
  },
  medium: {
    baseFontSize: '14px',
    text4xl: '36px',
    text3xl: '32px',
    text2xl: '28px',
    textXl: '24px',
    textLg: '20px',
    textBase: '16px',
    textSm: '14px',
    tablePadding: '10px'
  },
  large: {
    baseFontSize: '16px',
    text4xl: '40px',
    text3xl: '36px',
    text2xl: '32px',
    textXl: '28px',
    textLg: '24px',
    textBase: '18px',
    textSm: '16px',
    tablePadding: '12px'
  },
  'extra-large': {
    baseFontSize: '18px',
    text4xl: '44px',
    text3xl: '40px',
    text2xl: '36px',
    textXl: '32px',
    textLg: '28px',
    textBase: '20px',
    textSm: '18px',
    tablePadding: '14px'
  }
};

export const getInvoiceSizeConfig = (size: keyof typeof INVOICE_SIZES, fontSizeMultiplier: number = 1) => {
  const config = INVOICE_SIZES[size];
  return {
    baseFontSize: `${parseInt(config.baseFontSize) * fontSizeMultiplier}px`,
    text4xl: `${parseInt(config.text4xl) * fontSizeMultiplier}px`,
    text3xl: `${parseInt(config.text3xl) * fontSizeMultiplier}px`,
    text2xl: `${parseInt(config.text2xl) * fontSizeMultiplier}px`,
    textXl: `${parseInt(config.textXl) * fontSizeMultiplier}px`,
    textLg: `${parseInt(config.textLg) * fontSizeMultiplier}px`,
    textBase: `${parseInt(config.textBase) * fontSizeMultiplier}px`,
    textSm: `${parseInt(config.textSm) * fontSizeMultiplier}px`,
    tablePadding: `${parseInt(config.tablePadding) * fontSizeMultiplier}px`
  };
};
