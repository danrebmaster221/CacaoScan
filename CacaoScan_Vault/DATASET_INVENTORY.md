# Dataset Inventory & MLOps Info

## 1. Source Summary
- **Academic**: Luis Zhinin Vera (Ecuadorian), Mendeley (CocoaBeansQCV).
- **Local**: 500 Zamboanga-specific images (Trinitario/Rejected).
- **Total Count**: ~5,800 images.

## 2. Class Labels (Mutually Exclusive)
1. `Rejected`: Mold, broken, or insect-damaged.
2. `Needs_Drying`: High moisture/under-fermented.
3. `Criollo`: Premium variety.
4. `Forastero`: Bulk variety.
5. `Trinitario`: Local hybrid variety.

## 3. Training Specs
- **Model**: YOLOv8n (Nano).
- **Resolution**: 640x640.
- **Augmentations**: Horizontal flip, +/- 15% brightness, 15-degree rotation.
- **Target**: TFLite INT8 Quantization.