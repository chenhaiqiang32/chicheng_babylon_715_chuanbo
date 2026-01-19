<template>
    <ElDialog :title="$t(`dialog.scriptEditor.title`)" v-model="model" @close="close" width="900px"
        :close-on-click-modal="false">
        <div class="script-editor-dialog">
            <div class="editor-container" ref="editorContainerRef"></div>
            <div class="dialog-footer">
                <ElButton @click="close">{{ $t('dialog.scriptEditor.cancel') }}</ElButton>
                <ElButton type="primary" @click="handleSave">{{ $t('dialog.scriptEditor.save') }}</ElButton>
            </div>
        </div>
    </ElDialog>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as monaco from 'monaco-editor';
import { ElDialog, ElButton, ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { stopRegisterKeyDown, startRegisterKeyDown } from '@/utils/ShortcutKey';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

window.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker()
        }
        return new editorWorker()
    }
}

const { t } = useI18n();
const model = ref(true);
const editorContainerRef = ref<HTMLDivElement>();
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null;

const props = defineProps<{
    close: () => void;
    initialCode?: string;
    onSave?: (code: string) => void | Promise<void>;
}>();

// 配置 Monaco Editor 的类型定义和代码提示
function setupMonacoEditorTypes() {
    // 检查 Monaco Editor 是否已加载
    if (!monaco || !monaco.languages || !monaco.languages.typescript) {
        console.error('Monaco Editor TypeScript support not available');
        return;
    }

    try {
        // 使用类型断言访问 API（Monaco Editor 的类型定义可能不完整）
        const tsLang = monaco.languages.typescript as any;
        const jsDefaults = tsLang.javascriptDefaults;

        if (!jsDefaults) {
            console.error('javascriptDefaults not available');
            return;
        }

        // 配置 JavaScript/TypeScript 编译器选项
        jsDefaults.setCompilerOptions({
            target: tsLang.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: tsLang.ModuleResolutionKind.NodeJs,
            module: tsLang.ModuleKind.ESNext,
            noEmit: true,
            esModuleInterop: true,
            allowJs: true,
            typeRoots: ['node_modules/@types'],
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        });

        // 配置编辑器提示选项
        jsDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
            noSuggestionDiagnostics: false,
        });

        console.log('✓ Monaco Editor compiler options configured');
    } catch (error) {
        console.error('Failed to setup Monaco Editor types:', error);
    }

    // 添加全局类型定义
    const typeDefinitions = `
    // 全局类型定义 - Editor API
    declare const Editor: {
        Instance: {
            /** 当前场景 */
            Scene: import('@babylonjs/core').Scene;
            /** 引擎实例 */
            Engine: import('@babylonjs/core').AbstractEngine;
            /** 资源场景 */
            ResScene: import('@babylonjs/core').Scene;
            /** 创建粒子系统 */
            createParticleSystem(name: string): Promise<void>;
            /** 获取选中的节点 */
            selectNodes: import('@babylonjs/core').Node[];
            /** 设置当前场景 */
            setCurrentScene(uuid: string): void;
            /** 创建新场景 */
            createNewScene(name: string): Promise<import('@babylonjs/core').Scene>;
            /** 事件监听 */
            on<T extends keyof any>(event: T, callback: (data: any) => void): void;
            /** 移除事件监听 */
            off<T extends keyof any>(event: T, callback: (data: any) => void): void;
            /** 触发事件 */
            emit<T extends keyof any>(event: T, data: any): void;
        };
    };

    // Babylon.js 核心类型
    declare namespace BABYLON {
        export * from '@babylonjs/core';
    }

    // Vector3 类型和构造函数
    declare class Vector3 {
        constructor(x?: number, y?: number, z?: number);
        x: number;
        y: number;
        z: number;
        static Zero(): Vector3;
        static One(): Vector3;
        static Up(): Vector3;
        static Down(): Vector3;
        static Left(): Vector3;
        static Right(): Vector3;
        static Forward(): Vector3;
        static Backward(): Vector3;
        add(otherVector: Vector3): Vector3;
        subtract(otherVector: Vector3): Vector3;
        scale(scale: number): Vector3;
        length(): number;
        normalize(): Vector3;
        clone(): Vector3;
    }

    // Color3 类型和构造函数
    declare class Color3 {
        constructor(r?: number, g?: number, b?: number);
        r: number;
        g: number;
        b: number;
        static Red(): Color3;
        static Green(): Color3;
        static Blue(): Color3;
        static Black(): Color3;
        static White(): Color3;
        static Yellow(): Color3;
        static Magenta(): Color3;
        static Cyan(): Color3;
        clone(): Color3;
    }

    // Quaternion 类型
    declare class Quaternion {
        constructor(x?: number, y?: number, z?: number, w?: number);
        x: number;
        y: number;
        z: number;
        w: number;
        static Identity(): Quaternion;
        clone(): Quaternion;
    }

    // Scene 常用方法
    interface Scene {
        /** 场景名称 */
        name: string;
        /** 场景 UUID */
        uuid: string;
        /** 创建网格 */
        createDefaultCameraOrLight(createArcRotateCamera?: boolean, replace?: boolean, attachCameraControls?: boolean): void;
        /** 获取所有网格 */
        getMeshesByTags(tagsQuery: string): import('@babylonjs/core').AbstractMesh[];
        /** 获取所有灯光 */
        lights: import('@babylonjs/core').Light[];
        /** 获取所有相机 */
        cameras: import('@babylonjs/core').Camera[];
        /** 获取活动相机 */
        activeCamera: import('@babylonjs/core').Camera | null;
        /** 渲染 */
        render(): void;
    }

    // Mesh 常用方法
    interface Mesh {
        /** 位置 */
        position: Vector3;
        /** 旋转 */
        rotation: Vector3;
        /** 缩放 */
        scaling: Vector3;
        /** 可见性 */
        isVisible: boolean;
        /** 材质 */
        material: import('@babylonjs/core').Material | null;
        /** 设置位置 */
        setPositionWithLocalVector(vector: Vector3): Mesh;
        /** 设置旋转 */
        setRotationWithQuaternion(quaternion: Quaternion): Mesh;
        /** 克隆 */
        clone(name: string, newParent?: import('@babylonjs/core').Node, doNotCloneChildren?: boolean): Mesh;
        /** 释放资源 */
        dispose(): void;
    }

    // TransformNode 常用方法
    interface TransformNode {
        /** 位置 */
        position: Vector3;
        /** 旋转 */
        rotation: Vector3;
        /** 缩放 */
        scaling: Vector3;
        /** 可见性 */
        isVisible: boolean;
        /** 名称 */
        name: string;
        /** UUID */
        uuid: string;
        /** 克隆 */
        clone(name: string, newParent?: import('@babylonjs/core').Node, doNotCloneChildren?: boolean): TransformNode;
    }

    // Material 常用属性
    interface Material {
        /** 名称 */
        name: string;
        /** UUID */
        uuid: string;
        /** 透明度 */
        alpha: number;
        /** 背面裁剪 */
        backFaceCulling: boolean;
        /** 线框模式 */
        wireframe: boolean;
    }

    // PBRMaterial 常用属性
    interface PBRMaterial extends Material {
        /** 基础色 */
        albedoColor: Color3;
        /** 金属度 */
        metallic: number;
        /** 粗糙度 */
        roughness: number;
        /** 透明度 */
        alpha: number;
        /** 基础色贴图 */
        albedoTexture: import('@babylonjs/core').BaseTexture | null;
        /** 法线贴图 */
        bumpTexture: import('@babylonjs/core').BaseTexture | null;
        /** 金属度贴图 */
        metallicTexture: import('@babylonjs/core').BaseTexture | null;
    }

    // Light 常用属性
    interface Light {
        /** 强度 */
        intensity: number;
        /** 漫反射颜色 */
        diffuse: Color3;
        /** 镜面反射颜色 */
        specular: Color3;
        /** 位置 */
        position: Vector3;
    }

    // Camera 常用方法
    interface Camera {
        /** 位置 */
        position: Vector3;
        /** 旋转 */
        rotation: Vector3;
        /** 设置目标 */
        setTarget(target: Vector3): void;
        /** 获取前方向 */
        getForwardRay(length?: number): import('@babylonjs/core').Ray;
    }

    // 常用工具函数
    declare const console: {
        log(...args: any[]): void;
        error(...args: any[]): void;
        warn(...args: any[]): void;
        info(...args: any[]): void;
        debug(...args: any[]): void;
    };

    // 常用全局对象
    declare const Math: Math;
    declare const JSON: JSON;
    declare const Promise: PromiseConstructor;
    declare const setTimeout: typeof globalThis.setTimeout;
    declare const setInterval: typeof globalThis.setInterval;
    declare const clearTimeout: typeof globalThis.clearTimeout;
    declare const clearInterval: typeof globalThis.clearInterval;
    `;

    // 添加类型定义到 Monaco
    try {
        const jsDefaults = (monaco.languages.typescript as any).javascriptDefaults;
        if (jsDefaults && jsDefaults.addExtraLib) {
            jsDefaults.addExtraLib(
                typeDefinitions,
                'file:///global.d.ts'
            );
            console.log('Type definitions added to Monaco Editor');
        } else {
            console.warn('Cannot add extra lib: javascriptDefaults not available');
        }
    } catch (error) {
        console.error('Failed to add extra lib:', error);
    }

    // 注册自定义代码补全提供器
    try {
        monaco.languages.registerCompletionItemProvider('javascript', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const suggestions = [
                    // Editor API 提示
                    {
                        label: 'Editor.Instance',
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: 'Editor.Instance',
                        documentation: '编辑器实例，可以访问场景、引擎等',
                        range,
                    },
                    {
                        label: 'Editor.Instance.Scene',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'Editor.Instance.Scene',
                        documentation: '当前场景对象',
                        range,
                    },
                    {
                        label: 'Editor.Instance.Engine',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'Editor.Instance.Engine',
                        documentation: '引擎实例',
                        range,
                    },
                    {
                        label: 'Editor.Instance.createParticleSystem',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'Editor.Instance.createParticleSystem(${1:name})',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: '创建粒子系统',
                        range,
                    },
                    // Vector3 提示
                    {
                        label: 'new Vector3',
                        kind: monaco.languages.CompletionItemKind.Constructor,
                        insertText: 'new Vector3(${1:x}, ${2:y}, ${3:z})',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: '创建三维向量',
                        range,
                    },
                    {
                        label: 'Vector3.Zero',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'Vector3.Zero()',
                        documentation: '零向量 (0, 0, 0)',
                        range,
                    },
                    {
                        label: 'Vector3.Up',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'Vector3.Up()',
                        documentation: '上向量 (0, 1, 0)',
                        range,
                    },
                    // Color3 提示
                    {
                        label: 'new Color3',
                        kind: monaco.languages.CompletionItemKind.Constructor,
                        insertText: 'new Color3(${1:r}, ${2:g}, ${3:b})',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: '创建颜色',
                        range,
                    },
                    {
                        label: 'Color3.Red',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'Color3.Red()',
                        documentation: '红色',
                        range,
                    },
                    {
                        label: 'Color3.Green',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'Color3.Green()',
                        documentation: '绿色',
                        range,
                    },
                    {
                        label: 'Color3.Blue',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'Color3.Blue()',
                        documentation: '蓝色',
                        range,
                    },
                ];

                return { suggestions };
            },
            triggerCharacters: ['.'],
        });
        console.log('Custom completion provider registered');
    } catch (error) {
        console.error('Failed to register completion provider:', error);
    }
}

// 初始化 Monaco Editor
onMounted(async () => {
    stopRegisterKeyDown();
    await nextTick();
    if (editorContainerRef.value) {
        try {
            setupMonacoEditorTypes();
            editorInstance = monaco.editor.create(editorContainerRef.value, {
                value: props.initialCode,
                language: 'javascript',
                theme: 'vs-dark',
                suggest: {
                    showReferences: true,
                },
            });

        } catch (error) {
            console.error('Failed to initialize Monaco Editor:', error);
            ElMessage.error(t('dialog.scriptEditor.initFailed'));
        }
    }
});

// 清理编辑器实例
onUnmounted(() => {
    if (editorInstance) {
        editorInstance.dispose();
        editorInstance = null;
    }
    startRegisterKeyDown();
});

// 保存处理
async function handleSave() {
    if (editorInstance) {
        try {
            const code = editorInstance.getValue();
            if (props.onSave) {
                await props.onSave(code);
            }
            ElMessage.success(t('dialog.scriptEditor.saveSuccess'));
            close();
        } catch (error) {
            console.error('Save failed:', error);
            ElMessage.error(t('dialog.scriptEditor.saveFailed'));
        }
    }
}

function close() {
    model.value = false;
}

// 监听对话框关闭
watch(model, (newVal) => {
    if (!newVal) {
        close();
    }
});
</script>

<style scoped lang="scss">
.script-editor-dialog {
    display: flex;
    flex-direction: column;
    height: 600px;

    .editor-container {
        flex: 1;
        width: 100%;
        border: 1px solid var(--el-border-color);
        border-radius: 4px;
        overflow: hidden;
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--el-border-color);
    }
}
</style>
