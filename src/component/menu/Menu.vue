<template>
	<el-popover v-for="item in data" :show-arrow="false" :key="item.name" placement="top-start" :width="180"
		effect="customized">
		<template #reference>
			<span class="menu-btn" :class="item.class"> {{ $t(item.name) }}</span>
		</template>
		<template #default>
			<MenuItem v-for="child in item.children" :key="child.name" :data="child" />
		</template>
	</el-popover>
</template>
<script lang='ts' setup>
import MenuItem from './MenuItem.vue';

const props = defineProps<{
	data: MenuItem[];
}>();
</script>
<style lang='scss'>
.menu-btn {
	width: 30px;
	margin-right: 15px;
	font-weight: 600;
	text-align: center;
}

.menu-btn-sub {
	height: 32px;
	color: #fff;
	padding: 0 5px;
	text-align: left;
	text-indent: 10px;
	border-radius: 5px;
	line-height: 32px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	white-space: nowrap;

	&:hover {
		background-color: var(--bg-color-3);
	}

	.desc {
		color: #bbb;
		font-size: 11px;
	}
}

.disable-menu {
	pointer-events: none;
	opacity: .5;
}

.el-popper.is-customized {
	background: #252525;
	border-radius: 10px;
	border: 1px solid #60636A;
	box-shadow: 0px 10px 12px 0px #00000026;
}
</style>