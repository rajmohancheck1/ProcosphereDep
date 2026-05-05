package com.cts.mfrp.procuresphere.service;

import com.cts.mfrp.procuresphere.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS =
            Set.of("jpg", "jpeg", "png", "gif", "webp", "svg");

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB

    @Value("${app.uploads.dir:uploads}")
    private String uploadsDirProp;

    @Value("${app.uploads.url-prefix:/uploads}")
    private String urlPrefix;

    private Path productsDir;

    @PostConstruct
    public void init() throws IOException {
        Path root = Paths.get(uploadsDirProp).toAbsolutePath().normalize();
        productsDir = root.resolve("products");
        Files.createDirectories(productsDir);
        log.info("File uploads directory: {}", productsDir);
    }

    /**
     * Saves an uploaded image and returns a public URL path
     * (e.g. "/uploads/products/abc-uuid.png") that the frontend can use
     * directly in &lt;img src=&gt; tags.
     */
    public String saveProductImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file provided");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("File too large (max 5MB)");
        }

        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
        String ext = extensionOf(original).toLowerCase();
        if (!ALLOWED_IMAGE_EXTENSIONS.contains(ext)) {
            throw new BadRequestException("Unsupported file type: " + ext +
                    ". Allowed: " + String.join(", ", ALLOWED_IMAGE_EXTENSIONS));
        }

        String filename = UUID.randomUUID() + "." + ext;
        Path target = productsDir.resolve(filename);

        try (var in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BadRequestException("Failed to save file: " + e.getMessage());
        }

        return urlPrefix + "/products/" + filename;
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 && dot < filename.length() - 1 ? filename.substring(dot + 1) : "";
    }
}
