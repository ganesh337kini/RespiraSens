import { motion } from "framer-motion";

export default function GlassCard({ title, children, className = "" }) {
  return (
    <motion.section
      className={`glass-card ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2 }}
    >
      {title ? <h3>{title}</h3> : null}
      {children}
    </motion.section>
  );
}
