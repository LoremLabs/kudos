<script lang="ts">
  import { prettyPrintJson } from 'pretty-print-json';
  import stringify from 'safe-stable-stringify';
  import '$styles/pretty-print-json.css';

  export let obj: Record<string, any> = {};
</script>

{@html prettyPrintJson.toHtml(JSON.parse(stringify(obj)))}
