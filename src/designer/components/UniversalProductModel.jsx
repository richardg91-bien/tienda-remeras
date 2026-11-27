import { Html } from "@react-three/drei";

export default function UniversalProductModel({ model }) {
  const productName = model?.name || model?.id || "este producto";

  return (
    <Html center>
      <div
        role="status"
        className="max-w-xs rounded-xl border border-amber-300 bg-white/95 p-4 text-center text-sm text-gray-800 shadow-lg"
      >
        <strong className="block">Vista previa no disponible</strong>
        <span>
          Falta un modelo 3D propio y validar la plantilla real de estampado para {productName}.
          Este diseño todavía no está preparado para producción.
        </span>
      </div>
    </Html>
  );
}
