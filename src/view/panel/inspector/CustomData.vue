<template>
    <SectionField :title="$t('component.customData.title')">
        <template #right>
            <SVG name="add" @click.stop="openAddDialog"></SVG>
        </template>
        <div v-if="customDataList.length > 0">
            <div v-for="item in customDataList" :key="item.id" class="custom-data-item">
                <div class="item-header">
                    <ElInput v-model="item.name" size="small" class="name-input" placeholder="名称"
                        @blur="validateName(item)" @focus="saveOriginalName(item)"></ElInput>
                    <div class="item-type">{{ getTypeLabel(item.type) }}</div>
                    <SVG name="delete" @click="removeItem(item)" class="delete-icon"></SVG>
                </div>
                <div class="item-value">
                    <ElInputNumber
                        v-if="item.type === 'number'"
                        :model-value="item.value as number"
                        @update:modelValue="(val: number) => item.value = Number(val)"
                        size="small"
                        :controls="true"
                        style="width: 100%"
                    />
                    <ElInput
                        v-else-if="item.type === 'string'"
                        :model-value="item.value as string"
                        @update:modelValue="(val: string) => item.value = val"
                        size="small"
                        placeholder="值"
                    />
                    <ElSwitch
                        v-else-if="item.type === 'boolean'"
                        :model-value="item.value as boolean"
                        @update:modelValue="(val: any) => item.value = !!val"
                    />
                </div>
            </div>
        </div>
        <div v-else class="empty-state">
            {{ $t('component.customData.empty') }}
        </div>
    </SectionField>

    <ElDialog v-model="addDialogVisible" :title="$t('component.customData.addTitle')" width="400px">
        <ElForm ref="formRef" :model="formData" :rules="formRules" label-width="80px">
            <ElSpace>
                <ElFormItem :label="$t('component.customData.name')" prop="name">
                    <ElInput v-model="formData.name" placeholder="请输入名称"></ElInput>
                </ElFormItem>
                <ElFormItem :label="$t('component.customData.type')" prop="type">
                    <ElSelect v-model="formData.type" placeholder="请选择类型" style="width:100px; height: 32px;">
                        <ElOption label="Number" value="number"></ElOption>
                        <ElOption label="String" value="string"></ElOption>
                        <ElOption label="Boolean" value="boolean"></ElOption>
                    </ElSelect>
                </ElFormItem>
            </ElSpace>
            <ElFormItem :label="$t('component.customData.value')">
                <ElInputNumber
                    v-if="formData.type === 'number'"
                    :model-value="formData.value as number"
                    @update:modelValue="(val: number) => formData.value = Number(val)"
                    :controls="true"
                    style="width: 100%"
                />
                <ElInput
                    v-else-if="formData.type === 'string'"
                    :model-value="formData.value as string"
                    @update:modelValue="(val: string) => formData.value = val"
                    placeholder="请输入值"
                />
                <ElSwitch
                    v-else-if="formData.type === 'boolean'"
                    :model-value="formData.value as boolean"
                    @update:modelValue="(val: any) => formData.value = !!val"
                />
                <ElInput v-else disabled placeholder="请先选择类型"></ElInput>
            </ElFormItem>
        </ElForm>
        <template #footer>
            <ElSpace alignment="center">
                <ElButton @click="addDialogVisible = false">{{ $t('component.customData.cancel') }}</ElButton>
                <ElButton type="primary" @click="confirmAdd">{{ $t('component.customData.confirm') }}</ElButton>
            </ElSpace>
        </template>
    </ElDialog>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Node } from '@babylonjs/core';
import SVG from '@/component/common/SVG.vue';
import SectionField from '@/component/common/SectionField.vue';
import { ElDialog, ElForm, ElFormItem, ElInput, ElInputNumber, ElSelect, ElOption, ElSwitch, ElButton, ElMessageBox, ElSpace } from 'element-plus';
import { ID } from '@/utils/id';
import type { FormInstance, FormRules } from 'element-plus';

interface CustomDataItem {
    id: string;
    name: string;
    type: 'number' | 'string' | 'boolean';
    value: number | string | boolean;
}

const props = defineProps<{
    object: Node
}>();

const customDataList = ref<CustomDataItem[]>([])
const addDialogVisible = ref(false)
const formRef = ref<FormInstance>()
const formData = ref({
    name: '',
    type: 'string' as 'number' | 'string' | 'boolean',
    value: '' as number | string | boolean
})

const formRules: FormRules = {
    name: [
        { required: true, message: '请输入名称', trigger: 'blur' },
        {
            validator: (rule, value, callback) => {
                const isDuplicate = customDataList.value.some(item => item.name === value)
                if (isDuplicate) {
                    callback(new Error('名称已存在'))
                } else {
                    callback()
                }
            },
            trigger: 'blur'
        }
    ],
    type: [
        { required: true, message: '请选择类型', trigger: 'change' }
    ]
}

onMounted(() => {
    if (!props.object.metadata) {
        props.object.metadata = {
            customData: []
        }
    }
    if (!props.object.metadata.customData) {
        props.object.metadata.customData = []
    }
    customDataList.value = props.object.metadata.customData
});

watch(() => props.object, () => {
    if (!props.object.metadata) {
        props.object.metadata = {
            customData: []
        }
    }
    if (!props.object.metadata.customData) {
        props.object.metadata.customData = []
    }
    customDataList.value = props.object.metadata.customData
}, { immediate: true })

function openAddDialog() {
    formData.value = {
        name: '',
        type: 'string',
        value: ''
    }
    formRef.value?.clearValidate()
    addDialogVisible.value = true
}

function confirmAdd() {
    formRef.value?.validate((valid) => {
        if (valid) {
            const newItem: CustomDataItem = {
                id: ID.generateUUID(),
                name: formData.value.name,
                type: formData.value.type,
                value: formData.value.value
            }
            if (formData.value.type === 'number') {
                newItem.value = (formData.value.value as number) || 0
            } else if (formData.value.type === 'boolean') {
                newItem.value = (formData.value.value as boolean) || false
            } else {
                newItem.value = (formData.value.value as string) || ''
            }
            customDataList.value.push(newItem)
            addDialogVisible.value = false
        }
    })
}

function removeItem(item: CustomDataItem) {
    ElMessageBox.confirm($i18nT('component.customData.removeMessage'), $i18nT('component.customData.removeTitle'), {
        confirmButtonText: $i18nT('component.customData.confirm'),
        cancelButtonText: $i18nT('component.customData.cancel'),
        type: 'warning',
    }).then(() => {
        const index = customDataList.value.indexOf(item)
        if (index > -1) {
            customDataList.value.splice(index, 1)
        }
    }).catch(

    )
}

function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        'number': 'Number',
        'string': 'String',
        'boolean': 'Boolean'
    }
    return labels[type] || type
}

const originalNameMap = new Map<string, string>()

function saveOriginalName(item: CustomDataItem) {
    originalNameMap.set(item.id, item.name)
}

function validateName(item: CustomDataItem) {
    const isDuplicate = customDataList.value.some(other => other.id !== item.id && other.name === item.name)
    if (isDuplicate) {
        ElMessageBox.alert('名称已存在', '提示', {
            confirmButtonText: '确定',
            type: 'warning'
        }).then(() => {
            item.name = originalNameMap.get(item.id) || ''
        }).catch(() => {
            item.name = originalNameMap.get(item.id) || ''
        })
    } else {
        originalNameMap.set(item.id, item.name)
    }
}

onUnmounted(() => {

});
</script>
<style scoped lang='scss'>
.custom-data-item {
    margin: 8px 0;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--el-fill-color-light);

    .item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;

        .name-input {
            flex: 1;
        }

        .item-type {
            padding: 2px 8px;
            font-size: 12px;
            background: var(--el-color-primary);
            color: #fff;
            border-radius: 3px;
        }

        .delete-icon {
            cursor: pointer;
            color: var(--el-text-color-secondary);
            transition: color 0.3s;

            &:hover {
                color: var(--el-color-danger);
            }
        }
    }

    .item-value {
        display: flex;
        align-items: center;
    }
}

.empty-state {
    padding: 20px;
    text-align: center;
    color: var(--el-text-color-secondary);
    border: 1px dashed var(--border-color);
    border-radius: 4px;
    margin: 8px 0;
}
</style>
