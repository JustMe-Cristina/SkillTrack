import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import AppLayout from "../components/AppLayout";

const initialForm = {
  name: "",
  email: "",
  headline: "",
  city: "",
  university: "",
  specialization: "",
  study_year: "",
  target_role: "",
  preferred_work_mode: "",
  preferred_employment_type: "",
  bio: "",
  monthly_report_enabled: false,
  email_notifications_enabled: false,
  job_recommendations_enabled: false
};

export default function ProfilulMeu() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      setMessage("");

      const data = await apiFetch("/api/user/profile");

      const normalizedProfile = {
        ...initialForm,
        ...data.profile,
        monthly_report_enabled: Boolean(data.profile?.monthly_report_enabled),
        email_notifications_enabled: Boolean(data.profile?.email_notifications_enabled),
        job_recommendations_enabled: Boolean(data.profile?.job_recommendations_enabled)
      };

      setProfile(normalizedProfile);
      setForm(normalizedProfile);
    } catch (err) {
      console.error("GET PROFILE ERROR:", err);
      setMessage(err.message || "Nu s-a putut încărca profilul.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleCancelEdit() {
    setForm(profile || initialForm);
    setIsEditing(false);
    setMessage("");
  }

  async function handleSaveProfile(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        name: form.name,
        headline: form.headline,
        city: form.city,
        university: form.university,
        specialization: form.specialization,
        study_year: form.study_year,
        target_role: form.target_role,
        preferred_work_mode: form.preferred_work_mode,
        preferred_employment_type: form.preferred_employment_type,
        bio: form.bio,
        monthly_report_enabled: form.monthly_report_enabled,
        email_notifications_enabled: form.email_notifications_enabled,
        job_recommendations_enabled: form.job_recommendations_enabled
      };

      const data = await apiFetch("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      const updatedProfile = {
        ...form,
        ...data.profile
      };

      setProfile(updatedProfile);
      setForm(updatedProfile);
      setIsEditing(false);
      setMessage("Profilul a fost actualizat cu succes.");
    } catch (err) {
      console.error("PATCH PROFILE ERROR:", err);
      setMessage(err.message || "Nu s-a putut actualiza profilul.");
    } finally {
      setSaving(false);
    }
  }

  const accountSummary = useMemo(() => {
    if (!profile) {
      return {
        total_skills: 0,
        saved_jobs: 0,
        roadmaps_count: 0,
        completed_roadmaps: 0
      };
    }

    return {
      total_skills: Number(profile.total_skills || 0),
      saved_jobs: Number(profile.saved_jobs || 0),
      roadmaps_count: Number(profile.roadmaps_count || 0),
      completed_roadmaps: Number(profile.completed_roadmaps || 0)
    };
  }, [profile]);

  return (
    <AppLayout
      title="Profilul meu"
      subtitle="Gestionează informațiile contului, obiectivele profesionale și preferințele aplicației"
    >
      {message && <div style={styles.message}>{message}</div>}

      {loading ? (
        <div style={styles.card}>Se încarcă profilul...</div>
      ) : (
        <div style={styles.layout}>
          <div style={styles.leftColumn}>
            <div style={styles.card}>
              <div style={styles.identityHeader}>
                <div style={styles.initialsCircle}>
                  {getInitials(profile?.name)}
                </div>

                <div>
                  <h2 style={styles.profileName}>
                    {profile?.name || "Utilizator SkillTrack"}
                  </h2>
                  <div style={styles.profileEmail}>
                    {profile?.email || "Email indisponibil"}
                  </div>
                  <div style={styles.profileHeadline}>
                    {profile?.headline || "Adaugă un headline profesional"}
                  </div>
                </div>
              </div>

              <div style={styles.quickInfoList}>
                <div style={styles.quickInfoItem}>
                  <span style={styles.quickInfoLabel}>Oraș</span>
                  <span style={styles.quickInfoValue}>{profile?.city || "-"}</span>
                </div>

                <div style={styles.quickInfoItem}>
                  <span style={styles.quickInfoLabel}>Rol țintă</span>
                  <span style={styles.quickInfoValue}>
                    {profile?.target_role || "-"}
                  </span>
                </div>

                <div style={styles.quickInfoItem}>
                  <span style={styles.quickInfoLabel}>Work mode preferat</span>
                  <span style={styles.quickInfoValue}>
                    {formatWorkMode(profile?.preferred_work_mode)}
                  </span>
                </div>

                <div style={styles.quickInfoItem}>
                  <span style={styles.quickInfoLabel}>Tip job preferat</span>
                  <span style={styles.quickInfoValue}>
                    {formatEmploymentType(profile?.preferred_employment_type)}
                  </span>
                </div>
              </div>

              <div style={styles.actionRow}>
                {!isEditing ? (
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={() => setIsEditing(true)}
                  >
                    Editează profilul
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? "Se salvează..." : "Salvează modificările"}
                    </button>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      Renunță
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.sectionTitle}>Sumar cont</h3>

              <div style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>Competențe</div>
                  <div style={styles.summaryValue}>
                    {accountSummary.total_skills}
                  </div>
                </div>

                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>Joburi salvate</div>
                  <div style={styles.summaryValue}>
                    {accountSummary.saved_jobs}
                  </div>
                </div>

                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>Roadmap-uri</div>
                  <div style={styles.summaryValue}>
                    {accountSummary.roadmaps_count}
                  </div>
                </div>

                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>Roadmap-uri finalizate</div>
                  <div style={styles.summaryValue}>
                    {accountSummary.completed_roadmaps}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.rightColumn}>
            <form onSubmit={handleSaveProfile} style={styles.formSections}>
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Date cont</h3>

                <div style={styles.formGrid}>
                  <Field
                    label="Nume complet"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Ex: Cristina Pop"
                  />

                  <Field
                    label="Email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled
                    placeholder="Email"
                  />

                  <Field
                    label="Headline profesional"
                    name="headline"
                    value={form.headline}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Ex: Studentă orientată spre Data & BI"
                    fullWidth
                  />
                </div>
              </div>

              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Date academice și profesionale</h3>

                <div style={styles.formGrid}>
                  <Field
                    label="Universitate"
                    name="university"
                    value={form.university}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Ex: UBB Cluj-Napoca"
                  />

                  <Field
                    label="Specializare"
                    name="specialization"
                    value={form.specialization}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Ex: Informatică Economică"
                  />

                  <Field
                    label="An de studiu"
                    name="study_year"
                    value={form.study_year}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Ex: Anul 3"
                  />

                  <Field
                    label="Oraș"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Ex: Cluj-Napoca"
                  />
                </div>
              </div>

              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Obiectiv profesional</h3>

                <div style={styles.formGrid}>
                  <Field
                    label="Rol țintă"
                    name="target_role"
                    value={form.target_role}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Ex: Data Analyst / BI Analyst"
                  />

                  <div style={styles.field}>
                    <label style={styles.label}>Work mode preferat</label>
                    <select
                      style={styles.input}
                      name="preferred_work_mode"
                      value={form.preferred_work_mode}
                      onChange={handleChange}
                      disabled={!isEditing}
                    >
                      <option value="">Nespecificat</option>
                      <option value="REMOTE">Remote</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="ONSITE">Onsite</option>
                    </select>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Tip job preferat</label>
                    <select
                      style={styles.input}
                      name="preferred_employment_type"
                      value={form.preferred_employment_type}
                      onChange={handleChange}
                      disabled={!isEditing}
                    >
                      <option value="">Nespecificat</option>
                      <option value="INTERNSHIP">Internship</option>
                      <option value="PART_TIME">Part-time</option>
                      <option value="FULL_TIME">Full-time</option>
                    </select>
                  </div>

                  <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                    <label style={styles.label}>Despre mine</label>
                    <textarea
                      style={styles.textarea}
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="Scrie câteva rânduri despre tine, direcția ta profesională și ce urmărești prin SkillTrack."
                    />
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Preferințe cont</h3>

                <div style={styles.preferencesList}>
                  <ToggleRow
                    label="Raport lunar"
                    description="Primește un rezumat lunar al progresului tău."
                    name="monthly_report_enabled"
                    checked={form.monthly_report_enabled}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />

                  <ToggleRow
                    label="Notificări email"
                    description="Primește notificări importante despre cont și progres."
                    name="email_notifications_enabled"
                    checked={form.email_notifications_enabled}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />

                  <ToggleRow
                    label="Recomandări joburi"
                    description="Activează sugestii de joburi și direcții de dezvoltare."
                    name="job_recommendations_enabled"
                    checked={form.job_recommendations_enabled}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {isEditing && (
                <div style={styles.bottomActions}>
                  <button
                    type="submit"
                    style={styles.primaryButton}
                    disabled={saving}
                  >
                    {saving ? "Se salvează..." : "Salvează profilul"}
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Renunță
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  disabled,
  placeholder,
  fullWidth = false
}) {
  return (
    <div
      style={{
        ...styles.field,
        ...(fullWidth ? { gridColumn: "1 / -1" } : {})
      }}
    >
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}

function ToggleRow({ label, description, name, checked, onChange, disabled }) {
  return (
    <label style={styles.toggleRow}>
      <div>
        <div style={styles.toggleLabel}>{label}</div>
        <div style={styles.toggleDescription}>{description}</div>
      </div>

      <input
        type="checkbox"
        name={name}
        checked={Boolean(checked)}
        onChange={onChange}
        disabled={disabled}
      />
    </label>
  );
}

function getInitials(name) {
  if (!name) return "ST";

  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

function formatWorkMode(value) {
  if (value === "REMOTE") return "Remote";
  if (value === "HYBRID") return "Hybrid";
  if (value === "ONSITE") return "Onsite";
  return "-";
}

function formatEmploymentType(value) {
  if (value === "INTERNSHIP") return "Internship";
  if (value === "PART_TIME") return "Part-time";
  if (value === "FULL_TIME") return "Full-time";
  return "-";
}

const styles = {
  message: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    background: "#ffffff",
    color: "#374151",
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)"
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 20,
    alignItems: "start"
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 20
  },
  rightColumn: {
    minWidth: 0
  },
  formSections: {
    display: "flex",
    flexDirection: "column",
    gap: 20
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)"
  },
  identityHeader: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    marginBottom: 20
  },
  initialsCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#111827",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 800,
    flexShrink: 0
  },
  profileName: {
    margin: 0,
    color: "#111827"
  },
  profileEmail: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 14
  },
  profileHeadline: {
    marginTop: 8,
    color: "#374151",
    fontSize: 14,
    lineHeight: 1.6
  },
  quickInfoList: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  quickInfoItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6"
  },
  quickInfoLabel: {
    color: "#6b7280",
    fontSize: 14
  },
  quickInfoValue: {
    color: "#111827",
    fontWeight: 600,
    fontSize: 14,
    textAlign: "right"
  },
  actionRow: {
    marginTop: 20,
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: "#111827"
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    background: "#f9fafb",
    border: "1px solid #e5e7eb"
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: 800,
    color: "#111827"
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  label: {
    fontSize: 14,
    color: "#374151",
    fontWeight: 600
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    background: "white"
  },
  textarea: {
    minHeight: 120,
    resize: "vertical",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    fontFamily: "inherit"
  },
  preferencesList: {
    display: "flex",
    flexDirection: "column",
    gap: 14
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 14,
    borderRadius: 12,
    background: "#f9fafb",
    border: "1px solid #e5e7eb"
  },
  toggleLabel: {
    color: "#111827",
    fontWeight: 700,
    marginBottom: 4
  },
  toggleDescription: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 520
  },
  bottomActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  primaryButton: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 600
  },
  secondaryButton: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600
  }
};