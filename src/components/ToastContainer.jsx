import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function ToastContainer({ toasts }) {
    return (
        <div id="toast-container" className="toast-container">
            {toasts.map(toast => {
                let Icon = CheckCircle;
                if (toast.type === "warning") Icon = AlertTriangle;
                if (toast.type === "error") Icon = XCircle;
                
                return (
                    <div key={toast.id} className={`toast toast-${toast.type} visible`}>
                        <Icon size={16} />
                        <span>{toast.message}</span>
                    </div>
                );
            })}
        </div>
    );
}
