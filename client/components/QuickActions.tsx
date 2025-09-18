import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QuickActions() {
  return (
    <Card>
      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div style={{ gridColumn: "auto / span 4" }}>
          <div
            style={{
              backgroundColor: "rgb(255, 255, 255)",
              borderBottom: "1.11111px solid rgb(243, 244, 246)",
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              paddingBottom: 24,
              paddingTop: 16,
              paddingLeft: 16,
              paddingRight: 16,
              boxShadow:
                "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 10px 15px -3px, rgba(0, 0, 0, 0.04) 4px 6px -4px",
            }}
          >
            <h3 style={{ color: "rgb(17, 24, 39)", fontSize: 18, fontWeight: 600, lineHeight: "28px", marginBottom: 16 }}>
              Quick Actions
            </h3>

            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              <button
                style={{
                  appearance: "button",
                  backgroundImage: "linear-gradient(to right, rgb(239, 246, 255), rgb(238, 242, 255))",
                  borderBottom: "1.11111px solid rgb(191, 219, 254)",
                  borderRadius: 12,
                  cursor: "pointer",
                  padding: 16,
                  textAlign: "left",
                  transitionDuration: "0.2s",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", height: 40, width: 40, justifyContent: "center", backgroundColor: "rgb(37, 99, 235)", borderRadius: 8 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgb(255,255,255)", height: 24, width: 24, stroke: "rgb(255,255,255)" }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <div style={{ marginLeft: 12, cursor: "pointer", textAlign: "left" }}>
                    <p style={{ color: "rgb(30,58,138)", fontWeight: 500 }}>Team Chat</p>
                    <p style={{ color: "rgb(29,78,216)", fontSize: 14, lineHeight: "20px" }}>Connect with team</p>
                  </div>
                </div>
              </button>

              <button
                style={{
                  appearance: "button",
                  backgroundImage: "linear-gradient(to right, rgb(240, 253, 244), rgb(236, 245, 244))",
                  borderBottom: "1.11111px solid rgb(187, 247, 208)",
                  borderRadius: 12,
                  cursor: "pointer",
                  padding: 16,
                  textAlign: "left",
                  transitionDuration: "0.2s",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", height: 40, width: 40, justifyContent: "center", backgroundColor: "rgb(22,163,74)", borderRadius: 8 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgb(255,255,255)", height: 24, width: 24, stroke: "rgb(255,255,255)" }}>
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                      <polyline points="16 7 22 7 22 13"></polyline>
                    </svg>
                  </div>
                  <div style={{ marginLeft: 12, cursor: "pointer", textAlign: "left" }}>
                    <p style={{ color: "rgb(20,83,45)", fontWeight: 500 }}>Sales Tracker</p>
                    <p style={{ color: "rgb(21,128,61)", fontSize: 14, lineHeight: "20px" }}>View performance</p>
                  </div>
                </div>
              </button>

              <button
                style={{
                  appearance: "button",
                  backgroundImage: "linear-gradient(to right, rgb(255, 247, 237), rgb(254, 242, 242))",
                  borderBottom: "1.11111px solid rgb(255, 215, 170)",
                  borderRadius: 12,
                  cursor: "pointer",
                  padding: 16,
                  textAlign: "left",
                  transitionDuration: "0.2s",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", height: 40, width: 40, justifyContent: "center", backgroundColor: "rgb(234,88,12)", borderRadius: 8 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgb(255,255,255)", height: 24, width: 24, stroke: "rgb(255,255,255)" }}>
                      <rect width="16" height="20" x="4" y="2" rx="2"></rect>
                      <line x1="8" x2="16" y1="6" y2="6"></line>
                      <line x1="16" x2="16" y1="14" y2="18"></line>
                      <path d="M16 10h.01"></path>
                      <path d="M12 10h.01"></path>
                    </svg>
                  </div>
                  <div style={{ marginLeft: 12, cursor: "pointer", textAlign: "left" }}>
                    <p style={{ color: "rgb(124,45,18)", fontWeight: 500 }}>Number Sorter</p>
                    <p style={{ color: "rgb(194,65,12)", fontSize: 14, lineHeight: "20px" }}>Manage data</p>
                  </div>
                </div>
              </button>

              <button
                style={{
                  appearance: "button",
                  backgroundImage: "linear-gradient(to right, rgb(250, 245, 255), rgb(253, 242, 248))",
                  borderBottom: "1.11111px solid rgb(233, 213, 255)",
                  borderRadius: 12,
                  cursor: "pointer",
                  padding: 16,
                  textAlign: "left",
                  transitionDuration: "0.2s",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", height: 40, width: 40, justifyContent: "center", backgroundColor: "rgb(147,51,234)", borderRadius: 8 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgb(255,255,255)", height: 24, width: 24, stroke: "rgb(255,255,255)" }}>
                      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                    </svg>
                  </div>
                  <div style={{ marginLeft: 12, cursor: "pointer", textAlign: "left" }}>
                    <p style={{ color: "rgb(88,28,135)", fontWeight: 500 }}>Admin Panel</p>
                    <p style={{ color: "rgb(126,34,206)", fontSize: 14, lineHeight: "20px" }}>Manage users</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
