<template>
    <div class="control-bar">
        <div class="content">
            <el-button 
            v-for="action in actions" 
            :icon="action.icon" 
            :type="selectedControlMode === action.mode ? 'primary' : ''" 
            @click="OnIconClick(action.mode)"/>
        </div>
    </div>
</template>
<script setup lang='ts'>
import { Position, Rank, Refresh, TopLeft, ZoomIn } from '@element-plus/icons-vue';
import { ElButton } from 'element-plus';
import { ControlMode, useScene } from '@/store/useScene';
import { storeToRefs } from 'pinia';

const actions = [
    {icon: Position, mode: ControlMode.Select},
    {icon: Rank, mode: ControlMode.Move},
    {icon: Refresh, mode: ControlMode.Rotate},
    {icon: ZoomIn, mode: ControlMode.Scale}
]

const selectedControlMode = storeToRefs(useScene()).currentControlMode;

function OnIconClick(mode: ControlMode){
    useScene().setCurrentControlMode(mode);
}

</script>
<style scoped lang='scss'>
.control-bar {
    width: 100%;
    height: 100%;

    .content {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: row;
    }

    .content-icon {
        width: 36px;
        height: 36px;
    }
}
</style>