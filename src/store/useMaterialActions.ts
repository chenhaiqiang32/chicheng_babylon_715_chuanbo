import { RuntimeLibrary } from "@/3d/assets/RuntimeLibrary"
import { useDialog } from "@/view/dialog"
import { inject } from "vue"

export function useMaterialActions(options: {
    material: any 
    mesh?: any
    emitMatChanged?: () => void
}) {
    const propertyChanged = inject<(property: string, newValue: any, oldValue: any, type: string) => void>('propertyChanged')

    function changeProperty(property: string, newValue: any, oldValue: any, type: string) {
        propertyChanged?.('material.' + property, newValue, oldValue, type);
        // 更新材质球的效果
        RuntimeLibrary.Instance.dispatch('onMaterialChanged', { useCache: false });
    }

    async function changeMaterial() {
        const ChooseResDialog = (await import('@/view/dialog/ChooseResDialog.vue')).default
    
        useDialog(ChooseResDialog, {
          choose: async (res: any) => {
            if (!res) return
    
            const material = await RuntimeLibrary.Instance.getMaterial(res.uuid)
            if (material && options.mesh) {
              options.mesh.material = material
              options.emitMatChanged?.()
            }
          },
          type: 'material'
        })
      }


    function shareMaterial() {
        options.material.share = true
        options.material.isDirty = true
        RuntimeLibrary.Instance.addMaterial(options.material)
    }

    return {
        changeProperty,
        changeMaterial,
        shareMaterial
    }
}