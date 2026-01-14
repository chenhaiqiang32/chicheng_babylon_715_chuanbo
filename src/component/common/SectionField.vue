<template>
  <div class="editor-section">
    <div class="editor-section__header" @click="save">
      <div class="editor-section__toggle">
        <el-icon v-if="opened">
          <Minus />
        </el-icon>
        <el-icon v-else>
          <Plus />
        </el-icon>
      </div>
      <div class="editor-section__titlebar">
        <div class="editor-section__title">
          <slot name="title">{{ title }}</slot>
        </div>
        <div class="editor-section__right">
          <div class="editor-section__label">
            <slot name="right"></slot>
          </div>
          <el-tooltip v-if="tooltip" :content="tooltip" placement="top">
            <el-icon class="editor-section__info">
              <InfoFilled />
            </el-icon>
          </el-tooltip>
        </div>
      </div>
    </div>
    <div v-if="opened" class="editor-section__body">
      <div v-if="isProcessing" class="editor-section__overlay">
        <el-icon class="editor-section__spinner">
          <Loading />
        </el-icon>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { InfoFilled, Plus, Minus, Loading } from "@element-plus/icons-vue"

const props = defineProps<{ title?: any; label?: any; tooltip?: any; isProcessing?: boolean, open?: boolean }>()
const opened = ref<boolean>(props.open || get())


function save() {
  opened.value = !opened.value
  localStorage.setItem(props.title, opened.value.toString())
}

function get() {
  return localStorage.getItem(props.title) === 'true'
}

</script>

<style scoped>
.editor-section {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: 8px;
  padding: 4px;
  background-color: var(--bg-color-1);
  margin-top: 4px;
}

.editor-section__header {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-color-2);
  cursor: pointer;
  transition: background .2s;
}

.editor-section__header:hover {
  /* background: var(--el-color-info-light-7); */
  background-color: var(--bg-color-3);
}

.editor-section__titlebar {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.editor-section__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-section__label {
  color: var(--el-text-color-secondary);
}

.editor-section__body {
  position: relative;
}

.editor-section__overlay {
  position: absolute;
  inset: 0;

  display: flex;
  justify-content: center;
  align-items: center;
}

.editor-section__spinner {
  font-size: 24px;
  color: gray;
}

.editor-section__title {
  color: var(--title--color);
}

/* 为 el-icon 添加颜色样式 */
.editor-section__toggle .el-icon {
  color: var(--el-text-color-secondary);
}

.editor-section__info {
  color: var(--el-text-color-secondary);
}

.editor-section__info:hover {
  color: var(--el-text-color-primary);
}

.editor-section__spinner {
  color: var(--el-text-color-secondary);
}
</style>