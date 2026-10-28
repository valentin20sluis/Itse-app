import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { RIESGO_LABELS } from "@/modules/expedientes/constants/expediente-labels";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import type { ConstanciaData } from "@/modules/inspecciones/services/constancia.service";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 11, color: "#1a1a1a" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 4 },
  numero: { textAlign: "center", marginBottom: 24 },
  row: { flexDirection: "row", marginBottom: 6 },
  label: { width: 130, fontFamily: "Helvetica-Bold" },
  value: { flex: 1 },
  section: { marginTop: 18, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#999999", paddingVertical: 4 },
  tableHead: { fontFamily: "Helvetica-Bold" },
  colNombre: { flex: 3 },
  colProfesion: { flex: 2 },
  colDoc: { flex: 1.2 },
  firma: { marginTop: 80, alignItems: "center" },
  firmaLinea: { width: 220, borderTopWidth: 1, borderTopColor: "#1a1a1a", paddingTop: 4, textAlign: "center" },
  pie: { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 9, textAlign: "center", color: "#555555" },
});

function Fila({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function ConstanciaDesignacionDocument({ data }: { data: ConstanciaData }) {
  const { establecimiento: est } = data;
  return (
    <Document title={`Constancia ${data.numero}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Constancia de Designación de Inspectores</Text>
        <Text style={styles.numero}>N.° {data.numero}</Text>

        <Fila label="Expediente" value={data.expedienteNumero} />
        <Fila label="Establecimiento" value={est.nombreComercial} />
        <Fila label="Dirección" value={`${est.direccion}, ${est.distrito}`} />
        <Fila label="Nivel de riesgo" value={RIESGO_LABELS[data.nivelRiesgo]} />
        <Fila label="Tipo de ITSE" value={data.tipoItse === "PREVIA" ? "Previa" : "Posterior"} />
        <Fila label="Fecha de designación" value={formatFecha(data.fechaDesignacion)} />

        <Text style={styles.section}>Inspectores designados ({data.inspectores.length})</Text>
        <View style={[styles.tableRow, styles.tableHead]}>
          <Text style={styles.colNombre}>Nombre</Text>
          <Text style={styles.colProfesion}>Profesión</Text>
          <Text style={styles.colDoc}>Documento</Text>
        </View>
        {data.inspectores.map((i) => (
          <View key={i.documento} style={styles.tableRow}>
            <Text style={styles.colNombre}>{i.nombre}</Text>
            <Text style={styles.colProfesion}>{i.profesion ?? "-"}</Text>
            <Text style={styles.colDoc}>{i.documento}</Text>
          </View>
        ))}

        <View style={styles.firma}>
          <Text style={styles.firmaLinea}>Jefe de GRDyDC</Text>
          {data.jefeNombre ? <Text>{data.jefeNombre}</Text> : null}
        </View>

        <Text style={styles.pie} fixed>
          Proyecto académico. Documento sin validez oficial.
        </Text>
      </Page>
    </Document>
  );
}
