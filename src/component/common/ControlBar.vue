<template>
    <div class="control-bar">
        <div class="content">
            <el-button 
            v-for="action in actions" 
            :icon="action.icon" 
            :type="selectedControlMode === action.mode ? 'primary' : ''" 
            @click="OnIconClick(action.mode)"/>

            <el-button :icon="Plus" @click="OnImportClick"></el-button>
            <input ref="fileInput" type="file" accept=".glb,.gltf,.fbx"
            @change="HandleFileChange" style="display: none;"/>
        </div>
    </div>
</template>
<script setup lang='ts'>
import { Plus, Position, Rank, Refresh, TopLeft, ZoomIn } from '@element-plus/icons-vue';
import { ElButton, ElUpload } from 'element-plus';
import { ControlMode, useScene } from '@/store/useScene';
import { storeToRefs } from 'pinia';
import { ref } from 'vue'
import { Editor } from '@/3d/Editor';
import { AbstractMesh, ImportMeshAsync, SceneLoader, Vector3, type Scene } from '@babylonjs/core';
import { FBXLoader } from 'babylonjs-fbx-loader';

const actions = [
    {icon: Position, mode: ControlMode.Select},
    {icon: Rank, mode: ControlMode.Move},
    {icon: Refresh, mode: ControlMode.Rotate},
    {icon: ZoomIn, mode: ControlMode.Scale}
]

const fileInput = ref<HTMLInputElement>();

const selectedControlMode = storeToRefs(useScene()).currentControlMode;

function OnIconClick(mode: ControlMode){
    useScene().setCurrentControlMode(mode);
}

function OnImportClick()
{
    fileInput?.value.click();
}

function HandleFileChange(event: Event){
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if(!file) return;

    const scene = Editor.Instance['scene'] as Scene;
    //ImportMeshAsync(file, scene);
    SceneLoader.RegisterPlugin(new FBXLoader())

    SceneLoader.ImportMeshAsync('', '', file, scene).then(function({meshes}){
        useScene().setHierarchy(scene.rootNodes);
        //meshes.forEach((val, idx, array) => {
        //    val.scaling = new Vector3(0.01, 0.01, 0.01);
        //})
        //meshes[0].scaling = new Vector3(0.01, 0.01, 0.01);
    });
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