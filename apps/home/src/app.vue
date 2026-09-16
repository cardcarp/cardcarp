<script setup>
import { RouterView } from 'vue-router'
import { ConfigProvider, TooltipProvider } from 'reka-ui'
</script>

<template>
    <ConfigProvider :scrollBody="false">
        <TooltipProvider :disableHoverableContent="true">
            <RouterView />
        </TooltipProvider>
    </ConfigProvider>
</template>