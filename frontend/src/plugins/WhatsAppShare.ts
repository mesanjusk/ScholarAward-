import { registerPlugin } from '@capacitor/core';

export interface WhatsAppSharePlugin {
  sendToContact(options: {
    phone: string;
    message: string;
    imageBase64?: string;
  }): Promise<void>;
  openUrl(options: { url: string }): Promise<void>;
}

const WhatsAppShare = registerPlugin<WhatsAppSharePlugin>('WhatsAppShare');
export default WhatsAppShare;
