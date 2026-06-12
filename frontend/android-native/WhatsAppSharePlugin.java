package com.scholarawards.app;

import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "WhatsAppShare")
public class WhatsAppSharePlugin extends Plugin {

    @PluginMethod
    public void sendToContact(PluginCall call) {
        String phone  = call.getString("phone",   "");
        String message = call.getString("message", "");
        String imagePath = call.getString("imagePath", null);

        // Remove file:// prefix if present
        if (imagePath != null && imagePath.startsWith("file://")) {
            imagePath = imagePath.substring(7);
        }

        String jid = phone + "@s.whatsapp.net";

        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setPackage("com.whatsapp");
        intent.putExtra("jid", jid);
        intent.putExtra(Intent.EXTRA_TEXT, message);

        if (imagePath != null && !imagePath.isEmpty()) {
            File imageFile = new File(imagePath);
            if (imageFile.exists()) {
                Uri imageUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    imageFile
                );
                intent.setType("image/*");
                intent.putExtra(Intent.EXTRA_STREAM, imageUri);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                intent.setType("text/plain");
            }
        } else {
            intent.setType("text/plain");
        }

        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("WhatsApp not installed or error: " + e.getMessage());
        }
    }
}
