<template>
	<div class="context-menu" @click.stop="close">
		<div class="command" v-if="commands?.length != 0">
			<template v-for="e in commands">
				<MenuItem :index="0" :e="e">
				</MenuItem>
			</template>
		</div>
	</div>
</template>

<script lang='ts' setup>
import { computed } from 'vue';
import MenuItem from './menu-item.vue';

const props = defineProps<{
	commands: ContextMenuItem[];
	position: { x: number; y: number; };
	close: () => void;
}>();

const transform = computed(() => {
	if (props.commands) {
		const height = props.commands.length * 32;
		let y = props.position.y;
		let x = props.position.x;
		if ((y + height) > window.innerHeight) {
			y = window.innerHeight - height;
		}
		if (x + 200 > window.innerWidth) {
			x = window.innerWidth - 200;
		}
		return `translate(${x}px, ${y}px)`;
	}
});


</script>

<style lang='scss'>
.context-menu {
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0;
	left: 0;
	z-index: 9999;
	font-weight: bold;
	overflow: hidden;
	background: transparent !important;

	.command {
		border-radius: 2px;
		pointer-events: auto;
		display: flex;
		width: 110px;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: 10000;
		transform: v-bind(transform);
		box-sizing: content-box;
		padding: 6px;
		border: 1px solid var(--bg-color-2);
		background: var(--bg-color-1);
		border-radius: 5px;
	}
}

.context-menu {
	.el-button {
		span {
			font-weight: bold;
		}
	}
}
</style>
