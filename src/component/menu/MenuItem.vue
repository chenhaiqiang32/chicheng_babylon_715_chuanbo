<template>

	<template v-if="data.children">
		<el-popover :show-arrow="false" placement="right" :width="210" trigger="hover" :teleported="false"
			effect="customized">
			<template #reference>
				<div :class="{ 'disable-menu': data.disabled }" class="menu-btn-sub"
					style="display: flex; align-items: center; ">
					<span style="margin-right: auto;">{{ $t(data.name) }}</span>
					<img src="@/assets/img/arrow.svg" width="20px">
				</div>
			</template>
			<template #default v-if="props.data.children">
				<MenuItem class="menu-btn-sub" v-for="child in props.data.children" :data="child">
				{{ $t(child.name) }}
				</MenuItem>
			</template>
		</el-popover>
	</template>
	<template v-else>
		<div class="menu-btn-sub" @click="click(data)" :class="{ 'disable-menu': data.disabled }">
			<span :class="data.class">{{ $t(data.name) }}</span>
			<span class="desc" v-if="data.desc">{{ $t(data.desc) }}</span>
			<SVG v-if="check()" name="check"></SVG>
		</div>
	</template>
</template>
<script lang='ts' setup>
const props = defineProps<{
	data: MenuItem;
}>();

function click(m: MenuItem) {
	m?.callback?.();
}

function check() {
	if (props.data.checked) {
		if (typeof props.data.checked === 'function') {
			return props.data.checked();
		} else if (typeof props.data.checked === 'boolean') {
			return props.data.checked;
		} else {
			return props.data.checked;
		}
	} else {
		return false;
	}
}



</script>
<style lang='scss' scoped></style>