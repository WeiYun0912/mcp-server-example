<template>
    <div class="app">
        <GuitarStore />
    </div>
</template>

<script setup>
import GuitarStore from "./components/GuitarStore.vue";
</script>

<style>
body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    background-color: #f9f9f9;
}

.app {
    width: 100%;
    min-height: 100vh;
}
</style>
