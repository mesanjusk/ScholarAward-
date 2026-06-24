package com.scholarawards.app;

import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "WhatsAppShare")
public class WhatsAppSharePlugin extends Plugin {

    @PluginMethod
    public void sendToContact(PluginCall call) {
        String phone      = call.getString("phone",       "");
        String message    = call.getString("message",     "");
        String imageBase64 = call.getString("imageBase64", null);

        String jid = phone + "@s.whatsapp.net";

        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setPackage("com.whatsapp");
        intent.putExtra("jid", jid);
        intent.putExtra(Intent.EXTRA_TEXT, message);

        if (imageBase64 != null && !imageBase64.isEmpty()) {
            try {
                byte[] imageBytes = android.util.Base64.decode(imageBase64, android.util.Base64.DEFAULT);
                File cacheDir = getContext().getCacheDir();
                File imageFile = new File(cacheDir, "wa_invite_" + System.currentTimeMillis() + ".png");
                FileOutputStream fos = new FileOutputStream(imageFile);
                fos.write(imageBytes);
                fos.close();

                Uri imageUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    imageFile
                );
                intent.setType("image/*");
                intent.putExtra(Intent.EXTRA_STREAM, imageUri);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception e) {
                intent.setType("text/plain");
            }
        } else {
            intent.setType("text/plain");
        }

        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("WhatsApp not installed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url", "");
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open URL: " + e.getMessage());
        }
    }
}
