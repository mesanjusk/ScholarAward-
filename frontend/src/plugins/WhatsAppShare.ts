import { registerPlugin } from '@capacitor/core';

export interface WhatsAppSharePlugin {
  sendToContact(options: {
    phone: string;
    message: string;
    imagePath?: string;
  }): Promise<void>;
}

const WhatsAppShare = registerPlugin<WhatsAppSharePlugin>('WhatsAppShare');
export default WhatsAppShare;
