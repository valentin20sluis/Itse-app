export type FaqItem = { id: string; question: string; answer: string };

export const faqItems: FaqItem[] = [
  {
    id: "needs-itse",
    question: "¿Mi negocio necesita ITSE?",
    answer:
      "La ITSE es una inspección de seguridad requerida para obtener la licencia de funcionamiento. Según el nivel de riesgo de tu establecimiento, se realiza antes (riesgo alto y muy alto) o después (riesgo bajo y medio) de otorgada la licencia.",
  },
  {
    id: "validity",
    question: "¿Cuánto dura el certificado?",
    answer:
      "El certificado de ITSE tiene una vigencia de 2 años desde su expedición. Te avisamos 60 días antes del vencimiento para que renueves a tiempo.",
  },
  {
    id: "observations",
    question: "¿Qué pasa si me observan algo?",
    answer:
      "En una ITSE posterior (riesgo bajo y medio), las observaciones subsanables se levantan en un máximo de 3 días hábiles presentando una declaración jurada y fotos. En una ITSE previa (riesgo alto y muy alto), tienes hasta 20 días hábiles y se reanuda la diligencia. Si la observación es relevante en términos de riesgo, el informe es desfavorable.",
  },
  {
    id: "documents",
    question: "¿Qué documentos necesito?",
    answer:
      "Solicitud de ITSE (FUT), reporte de nivel de riesgo, declaración jurada de cumplimiento de condiciones de seguridad (solo para riesgo bajo y medio), plano de ubicación con cuadro de áreas, plano de distribución, plan de seguridad del establecimiento y comprobante de pago de la tasa. Los subes en digital, ya no necesitas copias físicas.",
  },
  {
    id: "risk-level",
    question: "¿Cómo sé mi nivel de riesgo?",
    answer:
      "Lo declaras al registrar tu trámite, con ayuda de preguntas orientativas sobre la función, el área, los pisos, el sótano y los inflamables. La clasificación final la confirma la municipalidad.",
  },
  {
    id: "renewal",
    question: "¿Cómo renuevo mi certificado?",
    answer:
      "Para riesgo alto y muy alto, presentas la solicitud, el pago y una declaración jurada de que se mantienen las condiciones de seguridad. Si las condiciones cambiaron, se tramita una ITSE nueva según el nuevo nivel de riesgo.",
  },
];
