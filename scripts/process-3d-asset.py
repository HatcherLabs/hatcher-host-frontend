"""Blender CLI script — decimate + export GLB with Draco compression.

Invoked by scripts/process-3d-asset.mjs. Do not run directly.

Args (via --):
    <input-path>   abs path to .fbx/.glb/.obj
    <output-dir>   abs output dir
    <variant>      'high' or 'low'
    <asset-name>   basename without extension

Variant presets:
    high  → decimate ratio 1.0, texture 2048
    low   → decimate ratio 0.4, texture 1024
"""
import bpy
import sys
import os

argv = sys.argv
argv = argv[argv.index("--") + 1:]
input_path, output_dir, variant, asset_name = argv

DECIMATE_RATIO = {"high": 1.0, "low": 0.4}[variant]
TEX_SIZE = {"high": 2048, "low": 1024}[variant]

# Wipe default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import based on extension
ext = os.path.splitext(input_path)[1].lower()
if ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath=input_path)
elif ext in (".glb", ".gltf"):
    bpy.ops.import_scene.gltf(filepath=input_path)
elif ext == ".obj":
    bpy.ops.wm.obj_import(filepath=input_path)
else:
    raise ValueError(f"Unsupported extension: {ext}")

# Apply decimate to every mesh
for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new(name="Decimate", type="DECIMATE")
    mod.ratio = DECIMATE_RATIO
    bpy.ops.object.modifier_apply(modifier="Decimate")

# Resize all image textures to TEX_SIZE (square clamp)
for img in bpy.data.images:
    if img.size[0] == 0 or img.size[1] == 0:
        continue
    max_side = max(img.size)
    if max_side > TEX_SIZE:
        scale = TEX_SIZE / max_side
        new_w = int(img.size[0] * scale)
        new_h = int(img.size[1] * scale)
        img.scale(new_w, new_h)

# Export GLB with Draco compression
output_path = os.path.join(output_dir, f"{asset_name}.{variant}.glb")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
    export_image_format="AUTO",
)
print(f"[process-3d-asset.py] wrote {output_path}")
