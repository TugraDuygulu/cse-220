"""File application service."""

from __future__ import annotations

import io
from pathlib import PurePosixPath
from uuid import UUID

from django.conf import settings
from django.core.files.base import ContentFile, File
from django.core.files.storage import FileSystemStorage
from PIL import Image

from files.repositories import FileRepository
from files.storage import (
    DEFAULT_MAX_FILE_SIZE,
    DEFAULT_MAX_IMAGE_PIXELS,
    FileStorage,
    LocalFileStorage,
    MinioStorage,
    StoredFile as StorageResult,
    StoredFileThumbnail,
)


class FileService:
    def __init__(
        self, 
        *, 
        storage: FileStorage, 
        repository: FileRepository | None = None,
        thumbnail_sizes: tuple[int, ...] = (64, 128, 256)
    ) -> None:
        self.storage = storage
        self.repository = repository or FileRepository()
        self.thumbnail_sizes = thumbnail_sizes

    def save(
        self,
        file: File,
        *,
        category: str,
        entity_id: str,
        content_type: str,
        generate_thumbnails: bool = False,
    ) -> tuple[UUID, StorageResult]:
        """Saves a file to storage and creates a database record."""
        stored = self.storage.save(
            file,
            category=category,
            entity_id=entity_id,
            content_type=content_type,
        )

        try:
            record = self.repository.create(
                path=stored.path,
                category=category,
                entity_id=entity_id,
                content_type=content_type,
                size=getattr(file, "size", None),
            )
        except Exception:
            self.storage.delete(stored.path)
            raise

        if not generate_thumbnails:
            return record.id, stored

        try:
            thumbnails = self._generate_thumbnails(
                file,
                source_path=stored.path,
                content_type=content_type,
            )
        except Exception:
            self.delete_by_id(record.id)
            raise
            
        return record.id, StorageResult(
            path=stored.path,
            url=stored.url,
            content_type=stored.content_type,
            thumbnails=thumbnails,
        )

    def delete_by_id(self, file_id: str | UUID) -> None:
        """Deletes file from storage and removes database record."""
        record = self.repository.get_by_id(file_id)
        if record:
            self.delete_path(record.path)
            self.repository.delete(file_id)

    def delete_path(self, path: str) -> None:
        """Deletes file and its thumbnails from storage."""
        self.storage.delete(path)
        parent = PurePosixPath(path).parent
        stem = PurePosixPath(path).stem
        for size in self.thumbnail_sizes:
            self.storage.delete(str(PurePosixPath(parent, "thumbnails", f"{stem}_{size}.jpg")))

    def get_url_by_id(self, file_id: str | UUID) -> str | None:
        """Resolves a file ID to a public storage URL."""
        record = self.repository.get_by_id(file_id)
        if record:
            return self.storage.get_url(record.path)
        return None

    def get_obfuscated_url(self, file_id: str | UUID) -> str:
        """Returns a stable API URL that hides the internal storage path."""
        from django.urls import reverse
        return reverse("files:serve-file", kwargs={"file_id": file_id})

    def exists(self, path: str) -> bool:
        return self.storage.exists(path)

    def create_presigned_upload_url(self, **kwargs):
        return self.storage.create_presigned_upload_url(**kwargs)

    def _generate_thumbnails(
        self,
        file: File,
        *,
        source_path: str,
        content_type: str,
    ) -> list[StoredFileThumbnail]:
        thumbnails: list[StoredFileThumbnail] = []
        file.seek(0)
        with Image.open(file) as source:
            source = source.convert("RGB")
            for size in self.thumbnail_sizes:
                image = source.copy()
                image.thumbnail((size, size))
                canvas = Image.new("RGB", (size, size), color=(255, 255, 255))
                left = (size - image.width) // 2
                top = (size - image.height) // 2
                canvas.paste(image, (left, top))

                buffer = io.BytesIO()
                canvas.save(buffer, format="JPEG", quality=85)
                buffer.seek(0)

                thumb_path = str(
                    PurePosixPath(
                        PurePosixPath(source_path).parent,
                        "thumbnails",
                        f"{PurePosixPath(source_path).stem}_{size}.jpg",
                    )
                )
                self.storage.delete(thumb_path)
                saved = self.storage.save_at_path(
                    ContentFile(buffer.read(), name=PurePosixPath(thumb_path).name),
                    path=thumb_path,
                    content_type="image/jpeg",
                )
                thumbnails.append(
                    StoredFileThumbnail(
                        path=saved.path,
                        url=saved.url,
                        size=size,
                    )
                )
        return thumbnails


def create_file_service() -> FileService:
    backend = getattr(settings, "FILE_STORAGE_BACKEND", "local").lower()
    thumbnail_sizes = tuple(getattr(settings, "FILE_STORAGE_THUMBNAIL_SIZES", (64, 128, 256)))
    repository = FileRepository()

    if backend == "local":
        storage = LocalFileStorage(
            storage=FileSystemStorage(
                location=getattr(settings, "FILE_STORAGE_LOCAL_ROOT", settings.MEDIA_ROOT),
                base_url=getattr(settings, "FILE_STORAGE_LOCAL_URL", settings.MEDIA_URL),
            ),
            max_size=getattr(settings, "FILE_STORAGE_MAX_SIZE", DEFAULT_MAX_FILE_SIZE),
            max_pixels=getattr(
                settings,
                "FILE_STORAGE_MAX_IMAGE_PIXELS",
                DEFAULT_MAX_IMAGE_PIXELS,
            ),
        )
        return FileService(storage=storage, repository=repository, thumbnail_sizes=thumbnail_sizes)

    if backend == "minio":
        from minio import Minio

        storage = MinioStorage(
            client=Minio(
                getattr(settings, "MINIO_ENDPOINT"),
                access_key=getattr(settings, "MINIO_ACCESS_KEY"),
                secret_key=getattr(settings, "MINIO_SECRET_KEY"),
                secure=getattr(settings, "MINIO_SECURE", False),
            ),
            bucket_name=getattr(settings, "MINIO_BUCKET_NAME"),
            max_size=getattr(settings, "FILE_STORAGE_MAX_SIZE", DEFAULT_MAX_FILE_SIZE),
            max_pixels=getattr(
                settings,
                "FILE_STORAGE_MAX_IMAGE_PIXELS",
                DEFAULT_MAX_IMAGE_PIXELS,
            ),
        )
        return FileService(storage=storage, repository=repository, thumbnail_sizes=thumbnail_sizes)

    raise ValueError(f"Unknown FILE_STORAGE_BACKEND: {backend}")
